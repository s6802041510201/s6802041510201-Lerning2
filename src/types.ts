export interface Question {
  id: number;
  text: string;
  options: string[];
  answerIndex: number; // Index of correct option (0-3)
  explanation: string;
}

export type StudentStatus = "ยังไม่เรียน" | "กำลังเรียน" | "เรียนจบ";

export interface StudentProgress {
  name: string;
  role: "student" | "admin";
  preTestCompleted: boolean;
  preTestScore: number;
  postTestCompleted: boolean;
  postTestScore: number;
  currentProgress: StudentStatus;
  visitedTabs: number[]; // Array of tab indices (1-6) they have read
  matchGameScore: number;
  timestamp: string;
  loginTime?: string;       // เวลาการเข้าใช้งานล่าสุด
  logoutTime?: string;      // เวลาการออกล่าสุด
  totalStudyTime?: number;  // เวลาที่อยู่ในระบบสะสม (วินาที)
}

export type MatchItem = {
  id: string;
  name: string;
  type: "input" | "process" | "output" | "storage";
  description: string;
};

export interface LeaderboardEntry {
  rank?: number;
  name: string;
  preTestScore: number;
  postTestScore: number;
  improvement: string;
  status: StudentStatus;
  timestamp: string;
  loginTime?: string;       // เวลาเข้าเรียน
  logoutTime?: string;      // เวลาออก
  totalStudyTime?: number;  // เวลาเรียนทั้งหมดสะสม (วินาที)
}
