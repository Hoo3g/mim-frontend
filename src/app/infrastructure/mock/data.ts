import { Post, PostType, JobType } from '../../core/models/post.model';
import { ResearchPaper } from '../../core/models/research-paper.model';

export const MOCK_POSTS: Post[] = [
    {
        id: '1',
        authorId: 'u1',
        authorName: 'Nguyễn Hồng Minh',
        authorAvatarUrl: 'https://i.pravatar.cc/150?u=u1',
        title: 'Sinh viên năm 4 tìm vị trí Thực tập Sinh Khoa học Dữ liệu',
        description: 'Em đang theo học chuyên ngành Khoa học Dữ liệu tại MIM-HUS. Có nền tảng toán học vững chắc và đam mê xử lý dữ liệu lớn.',
        requirements: 'Mong muốn làm việc trong môi trường chuyên nghiệp, có cơ hội tiếp xúc với bài toán thực tế.',
        achievements: 'GPA 3.8/4.0; Giải Ba Olympic Toán học sinh viên toàn quốc 2023; Chứng chỉ IELTS 7.5; Hoàn thành khóa học Machine Learning trên Coursera.',
        postType: PostType.STUDENT_SEEKING_INTERNSHIP,
        jobType: JobType.INTERNSHIP,
        tags: ['KHDL', 'GPA > 3.5', 'AI'],
        location: 'Hà Nội',
        contactEmail: 'minh.nh.mim@hus.edu.vn',
        contactPhone: '0987.654.321',
        studentCvUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        researchPaperLinks: [
            { id: 'p1', title: 'Một số cải tiến cho mô hình Transformer trong dịch máy đa ngữ', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
        ],
        status: 'OPEN',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
    },
    {
        id: '2',
        authorId: 'c1',
        authorName: 'Công ty Cổ phần FPT',
        authorAvatarUrl: 'https://ui-avatars.com/api/?name=FPT&background=0088CC&color=fff',
        title: 'Tuyển dụng Kỹ sư Phần mềm (Java/Spring Boot)',
        description: 'Tham gia phát triển các hệ thống lõi cho các dự án chuyển đổi số lớn của tập đoàn.',
        requirements: 'Nắm vững Java Core, Spring Framework. Ưu tiên sinh viên tốt nghiệp loại Khá/Giỏi các trường top đầu như HUS, HUST.',
        benefits: 'Lương tháng 13, thưởng dự án, bảo hiểm FPT Care.',
        postType: PostType.COMPANY_RECRUITING_JOB,
        jobType: JobType.FULL_TIME,
        tags: ['WEB', 'JAVA'],
        location: 'Hà Nội',
        salaryRange: '15M - 30M',
        contactEmail: 'hr@fpt.com.vn',
        contactPhone: '1900 6600',
        status: 'OPEN',
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
    },
    {
        id: '3',
        authorId: 'u2',
        authorName: 'Trần Văn Tú',
        authorAvatarUrl: 'https://i.pravatar.cc/150?u=u2',
        title: 'Cử nhân Toán học tìm việc làm Chuyên viên Định phí (Actuary)',
        description: 'Vừa tốt nghiệp chuyên ngành Toán kinh tế. Có khả năng phân tích định lượng và mô hình hóa tài chính.',
        requirements: 'Vị trí Junior Actuary hoặc Risk Analyst.',
        achievements: 'Đã vượt qua 2 kỳ thi của SOA (Exam P, Exam FM); Thành viên CLB Toán kinh tế MIM.',
        postType: PostType.STUDENT_SEEKING_JOB,
        jobType: JobType.FULL_TIME,
        tags: ['TKT', 'GPA > 3.5'],
        location: 'Hồ Chí Minh',
        contactEmail: 'tu.tv@gmail.com',
        contactPhone: '0912.345.678',
        status: 'OPEN',
        createdAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26')
    },
    {
        id: '4',
        authorId: 'c2',
        authorName: 'Trung tâm R&D Samsung Việt Nam',
        authorAvatarUrl: 'https://ui-avatars.com/api/?name=Samsung&background=000&color=fff',
        title: 'AI Research Intern (Mobile Vision)',
        description: 'Nghiên cứu và tối ưu các thuật toán xử lý ảnh trên thiết bị di động.',
        requirements: 'Kiến thức tốt về Computer Vision, Deep Learning (PyTorch/TensorFlow). Khả năng đọc hiểu tài liệu tiếng Anh tốt.',
        benefits: 'Hỗ trợ thực tập hấp dẫn, cơ hội trở thành nhân viên chính thức.',
        postType: PostType.COMPANY_RECRUITING_INTERNSHIP,
        jobType: JobType.INTERNSHIP,
        tags: ['AI', 'MOBILE'],
        location: 'Hà Nội',
        salaryRange: '8M - 12M',
        contactEmail: 'recruitment.srv@samsung.com',
        contactPhone: '024 3765 4321',
        status: 'OPEN',
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28')
    }
];

export const MOCK_PAPERS: ResearchPaper[] = [
    {
        id: 'p1',
        title: 'Một số cải tiến cho mô hình Transformer trong dịch máy đa ngữ',
        abstract: 'Nghiên cứu tập trung vào việc tối ưu hóa kiến trúc chú ý (attention mechanism) để cải thiện chất lượng dịch cho các cặp ngôn ngữ nghèo tài nguyên.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        publicationYear: 2023,
        journalConference: 'Hội nghị Quốc tế về Xử lý Ngôn ngữ Tự nhiên (NLP 2023)',
        researchArea: 'Trí tuệ nhân tạo',
        category: 'LECTURER',
        authors: [
            { studentId: 'l1', name: 'PGS.TS. Lê Kim Long', isMainAuthor: true, authorOrder: 1 },
            { studentId: 'u10', name: 'Nguyễn Thị Hoa', isMainAuthor: false, authorOrder: 2 }
        ],
        createdAt: new Date('2023-11-15'),
        updatedAt: new Date('2023-11-15')
    },
    {
        id: 'p2',
        title: 'Phân tích ổn định của hệ thống điều khiển mờ cho robot bám hành trình',
        abstract: 'Đề xuất phương pháp phân tích ổn định dựa trên hàm Lyapunov cho các hệ thống điều khiển mờ loại 2.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        publicationYear: 2024,
        journalConference: 'Tạp chí Khoa học & Công nghệ VNU',
        researchArea: 'Cơ học',
        category: 'STUDENT',
        authors: [
            { studentId: 'u3', name: 'Phạm Thành Nam', isMainAuthor: true, authorOrder: 1 },
            { studentId: 'l2', name: 'GS.TS. Nguyễn Hữu Đức', isMainAuthor: false, authorOrder: 2 }
        ],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
    },
    {
        id: 'p3',
        title: 'Thuật toán tối ưu hóa bầy đàn cải tiến cho bài toán định tuyến xe',
        abstract: 'Ứng dụng các kỹ thuật lai ghép để tăng tốc độ hội tụ và tránh bẫy tối ưu địa phương trong bài toán tối ưu hóa tổ hợp.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        publicationYear: 2023,
        journalConference: 'Journal of Mathematical Analysis and Applications',
        researchArea: 'Toán ứng dụng',
        category: 'LECTURER',
        authors: [
            { studentId: 'l3', name: 'TS. Hoàng Xuân Sính', isMainAuthor: true, authorOrder: 1 }
        ],
        createdAt: new Date('2023-12-05'),
        updatedAt: new Date('2023-12-05')
    },
    {
        id: 'p4',
        title: 'Ứng dụng Blockchain trong bảo mật hồ sơ y tế điện tử',
        abstract: 'Xây dựng khung làm việc dựa trên Hyperledger Fabric để đảm bảo tính toàn vẹn và quyền riêng tư của dữ liệu bệnh nhân.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        publicationYear: 2024,
        journalConference: 'Kỷ yếu Hội thảo Sinh viên Nghiên cứu Khoa học',
        researchArea: 'An ninh mạng',
        category: 'STUDENT',
        authors: [
            { studentId: 'u4', name: 'Đặng Minh Châu', isMainAuthor: true, authorOrder: 1 }
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
    }
];

export const MOCK_NEWS = [
    {
        id: 'n1',
        title: 'Thông báo: Lịch seminar chuyên đề Giải tích kỳ II năm học 2023-2024',
        date: '2024-02-01',
        summary: 'Seminar sẽ diễn ra vào chiều thứ 4 hàng tuần tại phòng 302-T5.'
    },
    {
        id: 'n2',
        title: 'Chúc mừng sinh viên MIM đạt giải cao tại kỳ thi lập trình ICPC Regional',
        date: '2024-01-29',
        summary: 'Đội tuyển HUS đã xuất sắc giành 01 Huy chương Vàng và 02 Huy chương Bạc.'
    },
    {
        id: 'n3',
        title: 'Hội thảo: Định hướng nghề nghiệp ngành Khoa học dữ liệu và Actuary',
        date: '2024-01-25',
        summary: 'Với sự tham gia của các chuyên gia đến từ các doanh nghiệp bảo hiểm và công nghệ hàng đầu.'
    },
    {
        id: 'n4',
        title: 'Thông báo về việc xét cấp học bổng Vallet năm 2024',
        date: '2024-01-20',
        summary: 'Sinh viên nộp hồ sơ đăng ký tại văn phòng Khoa trước ngày 15/02.'
    }
];
