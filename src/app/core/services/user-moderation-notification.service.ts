import { inject, Injectable, OnDestroy } from '@angular/core';
import { forkJoin, of, Subscription, timer } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

import { authSignal } from '../signals/auth.signal';
import { userNotificationSignal, UserNotification } from '../signals/user-notification.signal';
import { ApprovalStatus } from '../enums/post-status.enum';
import { Post } from '../models/post.model';
import { ResearchPaper } from '../models/research-paper.model';
import { PostService } from './post.service';
import { ResearchPaperService } from './research-paper.service';

@Injectable({ providedIn: 'root' })
export class UserModerationNotificationService implements OnDestroy {
    private static readonly POLL_INTERVAL_MS = 30_000;

    private readonly postService = inject(PostService);
    private readonly researchPaperService = inject(ResearchPaperService);

    private activeUserId: string | null = null;
    private pollingSubscription?: Subscription;

    start(): void {
        const currentUser = authSignal.user();
        if (!currentUser || authSignal.canUseAdminNotifications()) {
            this.stop();
            return;
        }

        if (this.activeUserId !== currentUser.id) {
            this.activeUserId = currentUser.id;
            userNotificationSignal.hydrate(this.loadStoredNotifications(currentUser.id));
        }

        if (this.pollingSubscription) {
            return;
        }

        this.pollingSubscription = timer(0, UserModerationNotificationService.POLL_INTERVAL_MS)
            .subscribe(() => this.syncNotifications());
    }

    stop(): void {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = undefined;
        this.activeUserId = null;
        userNotificationSignal.clearAll();
    }

    markAsRead(notificationId: string): void {
        const userId = this.activeUserId;
        if (!userId) {
            return;
        }
        userNotificationSignal.markAsRead(notificationId);
        this.persistNotifications(userId);
    }

    markAllAsRead(): void {
        const userId = this.activeUserId;
        if (!userId) {
            return;
        }
        userNotificationSignal.markAllAsRead();
        this.persistNotifications(userId);
    }

    clearAll(): void {
        const userId = this.activeUserId;
        if (!userId) {
            return;
        }
        userNotificationSignal.clearAll();
        this.persistNotifications(userId);
    }

    removeNotification(notificationId: string): void {
        const userId = this.activeUserId;
        if (!userId) {
            return;
        }
        userNotificationSignal.remove(notificationId);
        this.persistNotifications(userId);
    }

    ngOnDestroy(): void {
        this.stop();
    }

    private syncNotifications(): void {
        const currentUser = authSignal.user();
        if (!currentUser || !this.activeUserId || currentUser.id !== this.activeUserId || authSignal.canUseAdminNotifications()) {
            return;
        }

        const snapshotInitialized = this.isStatusSnapshotInitialized(currentUser.id);

        forkJoin({
            posts: this.postService.getMyPosts(currentUser.id, true).pipe(
                take(1),
                catchError(() => of([] as Post[]))
            ),
            papers: this.researchPaperService.getMyPapers(currentUser, true).pipe(
                take(1),
                catchError(() => of([] as ResearchPaper[]))
            )
        }).subscribe(({ posts, papers }) => {
            const statusSnapshot = this.loadStatusSnapshot(currentUser.id);

            for (const post of posts) {
                this.capturePostNotification(statusSnapshot, post, snapshotInitialized);
            }

            for (const paper of papers) {
                this.capturePaperNotification(statusSnapshot, paper, snapshotInitialized);
            }

            this.persistStatusSnapshot(currentUser.id, statusSnapshot);
            if (!snapshotInitialized) {
                this.persistStatusSnapshotInitialized(currentUser.id);
            }
            this.persistNotifications(currentUser.id);
        });
    }

    private capturePostNotification(
        snapshot: Record<string, string>,
        post: Post,
        snapshotInitialized: boolean
    ): void {
        const status = this.normalizeApprovalStatus(post.approvalStatus);
        const snapshotKey = `POST:${post.id}`;
        const hasPreviousStatus = Object.prototype.hasOwnProperty.call(snapshot, snapshotKey);
        const previousStatus = hasPreviousStatus ? snapshot[snapshotKey] : undefined;
        snapshot[snapshotKey] = status;

        if (!this.shouldNotify(previousStatus, hasPreviousStatus, status, snapshotInitialized)) {
            return;
        }

        const notificationStatus = status as UserNotification['status'];

        userNotificationSignal.upsert({
            id: `${snapshotKey}:${status}`,
            contentId: post.id,
            contentType: 'POST',
            status: notificationStatus,
            title: post.title,
            message: notificationStatus === ApprovalStatus.APPROVED
                ? 'Bài tuyển dụng của bạn đã được duyệt.'
                : this.buildRejectedMessage('Bài tuyển dụng', post.moderationComment),
            timestamp: post.updatedAt?.getTime?.() ?? Date.now(),
            read: false
        });
    }

    private capturePaperNotification(
        snapshot: Record<string, string>,
        paper: ResearchPaper,
        snapshotInitialized: boolean
    ): void {
        const status = this.normalizeApprovalStatus(paper.approvalStatus);
        const snapshotKey = `PAPER:${paper.id}`;
        const hasPreviousStatus = Object.prototype.hasOwnProperty.call(snapshot, snapshotKey);
        const previousStatus = hasPreviousStatus ? snapshot[snapshotKey] : undefined;
        snapshot[snapshotKey] = status;

        if (!this.shouldNotify(previousStatus, hasPreviousStatus, status, snapshotInitialized)) {
            return;
        }

        const notificationStatus = status as UserNotification['status'];

        userNotificationSignal.upsert({
            id: `${snapshotKey}:${status}`,
            contentId: paper.id,
            contentType: 'PAPER',
            status: notificationStatus,
            title: paper.title,
            message: notificationStatus === ApprovalStatus.APPROVED
                ? 'Bài nghiên cứu của bạn đã được duyệt.'
                : this.buildRejectedMessage('Bài nghiên cứu', paper.moderationComment),
            timestamp: paper.updatedAt?.getTime?.() ?? Date.now(),
            read: false
        });
    }

    private normalizeApprovalStatus(status?: string | null): ApprovalStatus {
        const normalized = (status ?? '').toString().trim().toUpperCase();
        if (normalized === ApprovalStatus.APPROVED) {
            return ApprovalStatus.APPROVED;
        }
        if (normalized === ApprovalStatus.REJECTED) {
            return ApprovalStatus.REJECTED;
        }
        return ApprovalStatus.PENDING;
    }

    private shouldNotify(
        previousStatus: string | undefined,
        hasPreviousStatus: boolean,
        nextStatus: ApprovalStatus,
        snapshotInitialized: boolean
    ): boolean {
        if (nextStatus === ApprovalStatus.PENDING) {
            return false;
        }

        if (!hasPreviousStatus) {
            return snapshotInitialized;
        }

        return previousStatus !== nextStatus;
    }

    private buildRejectedMessage(contentLabel: string, moderationComment?: string | null): string {
        const comment = (moderationComment ?? '').trim();
        if (!comment) {
            return `${contentLabel} của bạn đã bị từ chối.`;
        }
        return `${contentLabel} của bạn đã bị từ chối: ${comment}`;
    }

    private notificationsStorageKey(userId: string): string {
        return `mim:user-notifications:${userId}`;
    }

    private snapshotStorageKey(userId: string): string {
        return `mim:user-notification-status:${userId}`;
    }

    private snapshotInitializedStorageKey(userId: string): string {
        return `mim:user-notification-status-initialized:${userId}`;
    }

    private loadStoredNotifications(userId: string): UserNotification[] {
        try {
            const raw = localStorage.getItem(this.notificationsStorageKey(userId));
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map((item) => this.toStoredNotification(item))
                .filter((item): item is UserNotification => item !== null);
        } catch {
            return [];
        }
    }

    private toStoredNotification(value: unknown): UserNotification | null {
        if (!value || typeof value !== 'object') {
            return null;
        }

        const record = value as Record<string, unknown>;
        const contentType = record['contentType'] === 'POST' ? 'POST'
            : record['contentType'] === 'PAPER' ? 'PAPER'
                : null;
        const status = record['status'] === ApprovalStatus.APPROVED ? ApprovalStatus.APPROVED
            : record['status'] === ApprovalStatus.REJECTED ? ApprovalStatus.REJECTED
                : null;

        if (!contentType || !status) {
            return null;
        }

        return {
            id: String(record['id'] ?? ''),
            contentId: String(record['contentId'] ?? ''),
            contentType,
            status,
            title: String(record['title'] ?? ''),
            message: String(record['message'] ?? ''),
            timestamp: Number(record['timestamp'] ?? Date.now()),
            read: Boolean(record['read'])
        };
    }

    private loadStatusSnapshot(userId: string): Record<string, string> {
        try {
            const raw = localStorage.getItem(this.snapshotStorageKey(userId));
            if (!raw) {
                return {};
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
        } catch {
            return {};
        }
    }

    private persistStatusSnapshot(userId: string, snapshot: Record<string, string>): void {
        localStorage.setItem(this.snapshotStorageKey(userId), JSON.stringify(snapshot));
    }

    private isStatusSnapshotInitialized(userId: string): boolean {
        return localStorage.getItem(this.snapshotInitializedStorageKey(userId)) === '1';
    }

    private persistStatusSnapshotInitialized(userId: string): void {
        localStorage.setItem(this.snapshotInitializedStorageKey(userId), '1');
    }

    private persistNotifications(userId: string): void {
        localStorage.setItem(
            this.notificationsStorageKey(userId),
            JSON.stringify(userNotificationSignal.notifications())
        );
    }
}
