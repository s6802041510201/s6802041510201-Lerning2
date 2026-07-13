/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Cpu, 
  Layers, 
  HelpCircle, 
  Award, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  LogOut, 
  LogIn,
  User, 
  Shield, 
  Search, 
  ChevronRight, 
  Tv, 
  Gamepad2, 
  TrendingUp, 
  Clock,
  BookOpen,
  Info,
  Sparkles,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Eye
} from "lucide-react";
import Swal from "sweetalert2";
import { quizQuestions, contentTabs, matchItems, initialLeaderboard } from "./data";
import { Question, StudentProgress, LeaderboardEntry, MatchItem, StudentStatus } from "./types";

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || seconds <= 0) return "0 วินาที";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} นาที ${secs} วินาที`;
  }
  return `${secs} วินาที`;
};

export default function App() {
  // --- USER/STUDENT SESSION STATE ---
  const [studentName, setStudentName] = useState<string>(() => {
    return localStorage.getItem("hardware_student_name") || "";
  });
  const [role, setRole] = useState<"student" | "admin">(() => {
    return (localStorage.getItem("hardware_role") as "student" | "admin") || "student";
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("hardware_logged_in") === "true";
  });

  // --- COMPREHENSIVE LEARNING PROGRESS ---
  const [progress, setProgress] = useState<StudentProgress>(() => {
    const saved = localStorage.getItem("hardware_progress");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      name: "",
      role: "student",
      preTestCompleted: false,
      preTestScore: 0,
      postTestCompleted: false,
      postTestScore: 0,
      currentProgress: "ยังไม่เรียน",
      visitedTabs: [],
      matchGameScore: 0,
      timestamp: "",
      loginTime: "",
      logoutTime: "",
      totalStudyTime: 0
    };
  });

  // --- LOCAL LEADERBOARD ---
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem("hardware_leaderboard");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return initialLeaderboard;
  });

  // --- INTERACTIVE NAVIGATION & ACTIVE SECTIONS ---
  // Active Sidebar Section: 'pre-test' | 'tab-1'..'tab-6' | 'game' | 'post-test' | 'dashboard'
  const [activeSection, setActiveSection] = useState<string>("pre-test");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>("");

  // --- DYNAMIC PROGRESS PERCENT FOR VIBRANT PALETTE PROGRESS CIRCLE/BAR ---
  const progressPercent = useMemo(() => {
    let pct = 0;
    if (progress.preTestCompleted) pct += 20;
    pct += Math.min(6, progress.visitedTabs.length) * 10;
    if (progress.postTestCompleted) pct += 20;
    return pct;
  }, [progress]);

  // --- QUIZ GAME STATES ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizTimer, setQuizTimer] = useState<number>(20);
  const [quizScores, setQuizScores] = useState<number[]>([]); // 1 for correct, 0 for wrong
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<number[][]>([]); // Tracks original index of options for matching
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- HARDWARE MATCHING GAME STATES ---
  const [gameItems, setGameItems] = useState<MatchItem[]>([]);
  const [selectedGameItem, setSelectedGameItem] = useState<string | null>(null); // ID of item being selected to drop
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({}); // ID of item -> category string
  const [gameFeedback, setGameFeedback] = useState<{ id: string; success: boolean } | null>(null);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [gameMoves, setGameMoves] = useState<number>(0);

  // --- GLOBAL LOADING OVERLAY ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // --- PERSIST STATS IN USER ENVIRONMENT ---
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("hardware_student_name", studentName);
      localStorage.setItem("hardware_role", role);
      localStorage.setItem("hardware_logged_in", "true");
      
      const updatedProg = { ...progress, name: studentName, role: role };
      setProgress(updatedProg);
      localStorage.setItem("hardware_progress", JSON.stringify(updatedProg));
    } else {
      localStorage.removeItem("hardware_student_name");
      localStorage.removeItem("hardware_role");
      localStorage.removeItem("hardware_logged_in");
    }
  }, [isLoggedIn, studentName, role]);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("hardware_progress", JSON.stringify(progress));
    }
  }, [progress, isLoggedIn]);

  useEffect(() => {
    localStorage.setItem("hardware_leaderboard", JSON.stringify(leaderboard));
  }, [leaderboard]);

  // --- ACTIVE STUDY TIME TRACKER ---
  useEffect(() => {
    if (!isLoggedIn || !studentName) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextTime = (prev.totalStudyTime || 0) + 1;
        return {
          ...prev,
          totalStudyTime: nextTime
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, studentName]);

  // --- LEADERBOARD & PROGRESS TIMER SYNC ---
  useEffect(() => {
    if (isLoggedIn && studentName) {
      setLeaderboard((prevLeaderboard) => {
        const hasUser = prevLeaderboard.some(
          x => x.name === studentName + " (ปวช.)" || x.name === studentName
        );
        if (!hasUser) return prevLeaderboard;
        
        return prevLeaderboard.map((entry) => {
          if (entry.name === studentName + " (ปวช.)" || entry.name === studentName) {
            return {
              ...entry,
              totalStudyTime: progress.totalStudyTime || 0,
              loginTime: progress.loginTime || entry.loginTime,
              logoutTime: progress.logoutTime || entry.logoutTime
            };
          }
          return entry;
        });
      });
    }
  }, [progress.totalStudyTime, progress.loginTime, progress.logoutTime, isLoggedIn, studentName]);

  // --- AUDIO SPEED HELPER FOR VIDEOS ---
  const handleSetProgressStatus = (status: StudentStatus) => {
    setProgress(prev => ({
      ...prev,
      currentProgress: status
    }));
  };

  // --- SYNC PROGRESS TO GOOGLE SHEETS via APPS SCRIPT ---
  const syncToGoogleSheets = async (
    name: string,
    preScore: number,
    postScore: number,
    status: StudentStatus,
    improvementStr: string,
    passedLogoutTime?: string,
    passedTotalStudyTime?: number
  ) => {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbxZiekWOj-x9c_u9Z1UE-JtHYiPIJ1-KNw2tELeeyq_U_Yxv8KTHBQ6_usH9ZsxQXvGXA/exec";
    
    const timestampStr = new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    // Create parameters to match standard AppScript structures (supports both JSON or Form query parameters)
    const payload = {
      action: "save",
      id: "18I4yFbzkqGQNkdnKF_pU7kRadEsEq0E5ucaRQ86K2Ko", // Provided Sheet ID
      name: name,
      preTestScore: preScore,
      postTestScore: postScore,
      status: status,
      improvement: improvementStr,
      timestamp: timestampStr,
      loginTime: progress.loginTime || "",
      logoutTime: passedLogoutTime || progress.logoutTime || "",
      totalStudyTime: passedTotalStudyTime !== undefined ? passedTotalStudyTime : (progress.totalStudyTime || 0)
    };

    console.log("Syncing progress to Apps Script...", payload);

    try {
      // Send as POST request using no-cors to handle redirect limitations elegantly
      await fetch(webAppUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      console.log("Synced to Google Sheets successfully (No-CORS Mode).");
    } catch (e) {
      console.error("Failed to sync to Google Sheets:", e);
    }
  };

  // --- ACTIONS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูล",
        text: "กรุณาใส่ชื่อ-นามสกุล ของท่านเพื่อเข้าเรียนรู้นะครับ 🧑‍💻",
        confirmButtonColor: "#10b981"
      });
      return;
    }

    setLoadingMessage("กำลังลงทะเบียนเข้าสู่ระบบการเรียนรู้...");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsLoggedIn(true);

      // Check if this student already has records in local leaderboard to load their progress
      const existingEntry = leaderboard.find(
        x => x.name.trim().toLowerCase() === studentName.trim().toLowerCase()
      );

      if (existingEntry) {
        const loginTimeStr = new Date().toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok"
        });
        setProgress({
          name: studentName,
          role: role,
          preTestCompleted: existingEntry.preTestScore >= 0,
          preTestScore: existingEntry.preTestScore,
          postTestCompleted: existingEntry.postTestScore >= 0,
          postTestScore: existingEntry.postTestScore,
          currentProgress: existingEntry.status,
          visitedTabs: existingEntry.postTestScore >= 0 ? [1,2,3,4,5,6] : [1],
          matchGameScore: existingEntry.postTestScore >= 0 ? 8 : 0,
          timestamp: existingEntry.timestamp,
          loginTime: loginTimeStr,
          logoutTime: existingEntry.logoutTime || "",
          totalStudyTime: existingEntry.totalStudyTime || 0
        });
        
        if (existingEntry.preTestScore >= 0) {
          setActiveSection("tab-1");
        } else {
          setActiveSection("pre-test");
        }

        Swal.fire({
          icon: "success",
          title: "ยินดีต้อนรับกลับมา!",
          text: `พบคงคลังประวัติเรียนของ ${studentName} เรียบร้อย ยินดีต้อนรับเข้าสู่วิชาระบบปฏิบัติการคอมพิวเตอร์ครับ`,
          confirmButtonText: "ลุยต่อเลย!",
          confirmButtonColor: "#059669"
        });
      } else {
        // Initialize new student progress
        const loginTimeStr = new Date().toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok"
        });
        const newProg: StudentProgress = {
          name: studentName,
          role: role,
          preTestCompleted: false,
          preTestScore: 0,
          postTestCompleted: false,
          postTestScore: 0,
          currentProgress: "ยังไม่เรียน",
          visitedTabs: [],
          matchGameScore: 0,
          timestamp: new Date().toLocaleDateString("th-TH"),
          loginTime: loginTimeStr,
          logoutTime: "",
          totalStudyTime: 0
        };
        setProgress(newProg);
        setActiveSection("pre-test");

        Swal.fire({
          icon: "success",
          title: "ลงทะเบียนสำเร็จ!",
          html: `<p class='text-base font-sans'>สวัสดีคุณ <b>${studentName}</b> ระดับชั้น ปวช.<br/>กรุณาผ่าน <b>"แบบทดสอบก่อนเรียน"</b> เพื่อปลดล็อกเนื้อหาการเรียนนะครับ 🌱</p>`,
          confirmButtonText: "เริ่มทำแบบทดสอบ",
          confirmButtonColor: "#059669"
        });
      }
    }, 850);
  };

  const handleLogout = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบการเรียนรู้เพื่อเปลี่ยนผู้ใช้งานหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยัน ออกจากระบบ",
      cancelButtonText: "ยกเลิก"
    }).then((result) => {
      if (result.isConfirmed) {
        const outStr = new Date().toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok"
        });

        // 1. Update leaderboard with checkout time & study time before clearing
        setLeaderboard((prevLeaderboard) => {
          const updated = prevLeaderboard.map((entry) => {
            if (entry.name === studentName + " (ปวช.)" || entry.name === studentName) {
              return {
                ...entry,
                logoutTime: outStr,
                totalStudyTime: progress.totalStudyTime || 0
              };
            }
            return entry;
          });
          localStorage.setItem("hardware_leaderboard", JSON.stringify(updated));
          return updated;
        });

        // 2. Sync progress & logout time to Google Sheets via Apps Script
        syncToGoogleSheets(
          studentName + " (ปวช.)",
          progress.preTestScore,
          progress.postTestScore,
          progress.currentProgress,
          progress.postTestCompleted 
            ? `+${(progress.postTestScore - progress.preTestScore) * 10}%` 
            : "กำลังศึกษา",
          outStr,
          progress.totalStudyTime || 0
        );

        setIsLoggedIn(false);
        setStudentName("");
        setRole("student");
        setProgress({
          name: "",
          role: "student",
          preTestCompleted: false,
          preTestScore: 0,
          postTestCompleted: false,
          postTestScore: 0,
          currentProgress: "ยังไม่เรียน",
          visitedTabs: [],
          matchGameScore: 0,
          timestamp: "",
          loginTime: "",
          logoutTime: "",
          totalStudyTime: 0
        });
        setIsQuizStarted(false);
        setQuizFinished(false);
        // Clear storage keys
        localStorage.removeItem("hardware_student_name");
        localStorage.removeItem("hardware_role");
        localStorage.removeItem("hardware_logged_in");
        localStorage.removeItem("hardware_progress");
        
        Swal.fire({
          icon: "success",
          title: "ออกจากระบบสำเร็จ",
          text: "กลับมาเรียนรู้คอมพิวเตอร์ฮาร์ดแวร์ได้ใหม่ทุกเมื่อนะ!",
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // --- QUIZ CORE SYSTEM ---
  const startQuiz = (type: "pre" | "post") => {
    setIsQuizStarted(true);
    setQuizFinished(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizTimer(20);
    setQuizScores([]);

    if (type === "pre") {
      // Use standard pre-defined quizQuestions list
      setShuffledQuestions(quizQuestions);
      // Identity options mapping (no shuffling for pre-test)
      const mockMap = quizQuestions.map(() => [0, 1, 2, 3]);
      setShuffledOptionsMap(mockMap);
    } else {
      // Post-test: Shuffle questions list AND option order to prevent mechanical recall
      const shuffledQ = [...quizQuestions].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffledQ);

      const mapList: number[][] = [];
      shuffledQ.forEach((q) => {
        // Shuffle index map
        const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        mapList.push(indices);
      });
      setShuffledOptionsMap(mapList);
    }

    // Start Clock
    triggerTimer();
  };

  const triggerTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQuizTimer(20);
    
    timerRef.current = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Timer Expired: Mark as wrong
          handleAnswerSubmit(-1, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswerSubmit = (optionIndex: number, isAutoExpired = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let isCorrect = false;
    const currentQ = shuffledQuestions[currentQuestionIndex];
    const optionMap = shuffledOptionsMap[currentQuestionIndex];

    if (!isAutoExpired && optionIndex !== -1) {
      // Map back to original option index
      const originalOptionIndex = optionMap[optionIndex];
      isCorrect = originalOptionIndex === currentQ.answerIndex;
    }

    setQuizScores((prev) => [...prev, isCorrect ? 1 : 0]);
    setSelectedAnswer(optionIndex);

    // Provide immediate interactive popup explanation
    if (isAutoExpired) {
      Swal.fire({
        icon: "error",
        title: "หมดเวลาในข้อนี้!",
        text: "คุณไม่ได้เลือกคำตอบภายในเวลา 20 วินาที ระบบจะหักคะแนนข้อนี้ และเฉลยดังนี้ครับ...",
        footer: `<div class='text-sm text-gray-500 font-sans text-left'><b>คำอธิบาย:</b> ${currentQ.explanation}</div>`,
        confirmButtonColor: "#10b981",
        confirmButtonText: "ทำข้อถัดไป"
      }).then(() => {
        advanceQuiz();
      });
    } else {
      Swal.fire({
        icon: isCorrect ? "success" : "error",
        title: isCorrect ? "ตอบถูกต้อง! 🎉" : "ตอบไม่ถูกนะยอดรัก 💔",
        html: `<p class='text-base font-sans'>${isCorrect ? "ยอดเยี่ยมมากครับความรู้แน่นปึ้ก" : "ไม่เป็นไรครับ เรียนรู้จากความผิดพลาดได้"}<br/><br/><span class='text-xs text-gray-400 block text-left bg-slate-50 p-3 rounded border border-gray-100 mt-2'><b>เฉลยและเกร็ดความรู้:</b> ${currentQ.explanation}</span></p>`,
        confirmButtonColor: "#059669",
        confirmButtonText: "ทำข้อถัดไป"
      }).then(() => {
        advanceQuiz();
      });
    }
  };

  const advanceQuiz = () => {
    setSelectedAnswer(null);
    if (currentQuestionIndex + 1 < shuffledQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      triggerTimer();
    } else {
      // Finish Quiz!
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalScore = quizScores.reduce((sum, val) => sum + val, 0);
    setQuizFinished(true);
    setIsQuizStarted(false);

    const isPreTest = activeSection === "pre-test";

    if (isPreTest) {
      setProgress((prev) => ({
        ...prev,
        preTestCompleted: true,
        preTestScore: finalScore,
        currentProgress: "กำลังเรียน",
        visitedTabs: [1] // Unlocks first tab
      }));

      // Generate a row on the local leaderboard & Sync
      const newEntry: LeaderboardEntry = {
        name: studentName + " (ปวช.)",
        preTestScore: finalScore,
        postTestScore: -1, // Not completed yet
        improvement: "กำลังศึกษา",
        status: "กำลังเรียน",
        timestamp: new Date().toLocaleString("th-TH", { hour12: false }).substring(0, 16),
        loginTime: progress.loginTime,
        logoutTime: progress.logoutTime,
        totalStudyTime: progress.totalStudyTime
      };

      // Add or Update in leaderboard state
      setLeaderboard((prev) => {
        const filtered = prev.filter(x => x.name !== newEntry.name);
        return [newEntry, ...filtered];
      });

      syncToGoogleSheets(
        studentName + " (ปวช.)", 
        finalScore, 
        -1, 
        "กำลังเรียน", 
        "กำลังศึกษา",
        progress.logoutTime,
        progress.totalStudyTime
      );

      Swal.fire({
        icon: "success",
        title: "ทำแบบทดสอบก่อนเรียนเสร็จสิ้น!",
        html: `<div class='font-sans'><p class='text-lg'>คุณได้คะแนน: <b class='text-emerald-600 text-2xl'>${finalScore}/10</b> คะแนน</p><p class='text-sm text-gray-500 mt-2'>ขณะนี้บทเรียนทั้ง 6 แท็ป และมัลติมีเดียสื่อเกมได้รับการปลดล็อกแล้ว ยินดีต้อนรับเข้าสู่วิศวกรรมคอมพิวเตอร์ขั้นพื้นฐานครับ!</p></div>`,
        confirmButtonText: "เริ่มเข้าสู่บทเรียน",
        confirmButtonColor: "#059669"
      }).then(() => {
        setActiveSection("tab-1");
      });

    } else {
      // Post Test
      setProgress((prev) => ({
        ...prev,
        postTestCompleted: true,
        postTestScore: finalScore,
        currentProgress: "เรียนจบ",
        visitedTabs: [1, 2, 3, 4, 5, 6]
      }));

      const preScoreVal = progress.preTestScore;
      const growthVal = finalScore - preScoreVal;
      const improvementStr = growthVal >= 0 ? `+${growthVal * 10}%` : `${growthVal * 10}%`;

      // Update in leaderboard state
      const finalEntry: LeaderboardEntry = {
        name: studentName + " (ปวช.)",
        preTestScore: preScoreVal,
        postTestScore: finalScore,
        improvement: improvementStr,
        status: "เรียนจบ",
        timestamp: new Date().toLocaleString("th-TH", { hour12: false }).substring(0, 16),
        loginTime: progress.loginTime,
        logoutTime: progress.logoutTime,
        totalStudyTime: progress.totalStudyTime
      };

      setLeaderboard((prev) => {
        const filtered = prev.filter(x => x.name !== finalEntry.name);
        return [finalEntry, ...filtered];
      });

      syncToGoogleSheets(
        studentName + " (ปวช.)", 
        preScoreVal, 
        finalScore, 
        "เรียนจบ", 
        improvementStr,
        progress.logoutTime,
        progress.totalStudyTime
      );

      let qualityLevel = "";
      if (finalScore >= 9) qualityLevel = "ดีเยี่ยม (Excellent) 🏆";
      else if (finalScore >= 7) qualityLevel = "ดี (Good) 🌟";
      else if (finalScore >= 5) qualityLevel = "พอใช้ (Fair) 👍";
      else qualityLevel = "ควรปรับปรุง (Needs Improvement) 📖";

      Swal.fire({
        icon: "success",
        title: "ยินดีด้วยคุณเรียนจบหลักสูตรแล้ว!",
        html: `
          <div class='font-sans space-y-3 text-left'>
            <div class='p-3 bg-emerald-50 rounded border border-emerald-100 text-center'>
              <span class='text-xs text-emerald-600 uppercase tracking-widest font-bold'>ผลการทดสอบหลังเรียน</span>
              <p class='text-3xl font-extrabold text-emerald-700'>${finalScore} / 10 คะแนน</p>
            </div>
            <p class='text-sm text-gray-700'><b>คะแนนก่อนเรียน:</b> ${preScoreVal}/10</p>
            <p class='text-sm text-gray-700'><b>คะแนนหลังเรียน:</b> ${finalScore}/10</p>
            <p class='text-sm text-gray-700'><b>การพัฒนาการ:</b> <span class='text-emerald-600 font-bold'>${improvementStr}</span></p>
            <p class='text-sm text-gray-700'><b>ระดับคุณภาพ:</b> <span class='font-bold text-emerald-800'>${qualityLevel}</span></p>
          </div>
        `,
        confirmButtonText: "ดูรายงานความก้าวหน้าและการพัฒนา",
        confirmButtonColor: "#059669"
      }).then(() => {
        setActiveSection("dashboard");
      });
    }
  };

  // Ensure timer clears on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Track content tab visits
  const handleTabVisit = (tabId: number) => {
    if (isLoggedIn && progress.preTestCompleted) {
      if (!progress.visitedTabs.includes(tabId)) {
        setProgress((prev) => {
          const updatedVisited = [...prev.visitedTabs, tabId];
          // Check if user has read everything to set progress status to "เรียนจบ" or "กำลังเรียน"
          let newStatus = prev.currentProgress;
          if (updatedVisited.length === 6 && prev.postTestCompleted) {
            newStatus = "เรียนจบ";
          } else {
            newStatus = "กำลังเรียน";
          }

          return {
            ...prev,
            visitedTabs: updatedVisited,
            currentProgress: newStatus
          };
        });
      }
    }
  };

  // --- HARDWARE MATCHING GAME LOGIC ---
  const initMatchingGame = () => {
    // Shuffle the items
    const shuffled = [...matchItems].sort(() => Math.random() - 0.5);
    setGameItems(shuffled);
    setMatchedPairs({});
    setSelectedGameItem(null);
    setGameFeedback(null);
    setGameFinished(false);
    setGameMoves(0);
  };

  useEffect(() => {
    if (activeSection === "game") {
      initMatchingGame();
    }
  }, [activeSection]);

  const selectGameItem = (itemId: string) => {
    if (matchedPairs[itemId]) return; // Already correctly placed
    setSelectedGameItem(itemId);
  };

  const handlePlaceInCategory = (category: "input" | "process" | "output" | "storage") => {
    if (!selectedGameItem) {
      Swal.fire({
        icon: "info",
        title: "กรุณาเลือกอุปกรณ์ก่อน",
        text: "คลิกเลือกการ์ดฮาร์ดแวร์ฝั่งซ้ายมือ แล้วค่อยกดเลือกหน่วยการทำงานขวามือนะครับ",
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const item = gameItems.find((x) => x.id === selectedGameItem);
    if (!item) return;

    setGameMoves((prev) => prev + 1);

    if (item.type === category) {
      // Correct!
      setMatchedPairs((prev) => ({
        ...prev,
        [selectedGameItem]: category
      }));
      setGameFeedback({ id: selectedGameItem, success: true });
      setSelectedGameItem(null);

      // Trigger Swal notification briefly for micro-feedback
      const correctEmojis = ["🎉", "✨", "🔥", "🌈", "⚡"];
      const randomEmoji = correctEmojis[Math.floor(Math.random() * correctEmojis.length)];
      
      // Let's check if game finished
      const updatedPairs = { ...matchedPairs, [selectedGameItem]: category };
      if (Object.keys(updatedPairs).length === gameItems.length) {
        setGameFinished(true);
        const bonusScore = Math.max(10, 100 - (gameMoves + 1 - gameItems.length) * 5);
        setProgress((prev) => ({
          ...prev,
          matchGameScore: 8
        }));
        
        Swal.fire({
          icon: "success",
          title: "คุณชนะแล้ว! 🏆",
          html: `<div class='font-sans'><p class='text-lg'>คุณจัดกลุ่มอุปกรณ์ฮาร์ดแวร์คอมพิวเตอร์ครบทั้ง 8 ชนิดอย่างสมบูรณ์แบบ!</p><p class='text-sm text-gray-500 mt-2'><b>จำนวนครั้งที่พยายามกด:</b> ${gameMoves + 1} ครั้ง</p></div>`,
          confirmButtonText: "สุดยอดไปเลย!",
          confirmButtonColor: "#059669"
        });
      }
    } else {
      // Wrong match
      setGameFeedback({ id: selectedGameItem, success: false });
      Swal.fire({
        icon: "error",
        title: "จัดหมวดหมู่ยังไม่ถูกนะ!",
        text: `${item.name} ไม่ได้อยู่ใน หน่วยงานนี้ ลองทบทวนสถาปัตยกรรมดูใหม่นะครับ 🤔`,
        timer: 1500,
        showConfirmButton: false
      });
      setSelectedGameItem(null);
    }

    setTimeout(() => {
      setGameFeedback(null);
    }, 1200);
  };

  // --- LEADERBOARD & STATS ANALYSIS ---
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      // Sort primarily by highest postTestScore, then by preTestScore
      const aPost = a.postTestScore >= 0 ? a.postTestScore : -1;
      const bPost = b.postTestScore >= 0 ? b.postTestScore : -1;
      if (bPost !== aPost) {
        return bPost - aPost;
      }
      return b.preTestScore - a.preTestScore;
    });
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedLeaderboard;
    return sortedLeaderboard.filter((entry) =>
      entry.name.toLowerCase().includes(query)
    );
  }, [sortedLeaderboard, searchQuery]);

  const filteredAdminLeaderboard = useMemo(() => {
    const query = adminSearchQuery.trim().toLowerCase();
    if (!query) return sortedLeaderboard;
    return sortedLeaderboard.filter((entry) =>
      entry.name.toLowerCase().includes(query)
    );
  }, [sortedLeaderboard, adminSearchQuery]);

  // Calculations for charts/stats in Student Dashboard
  const gradeLabel = useMemo(() => {
    const score = progress.postTestScore;
    if (!progress.postTestCompleted) return "รอดำเนินการวัดผล";
    if (score >= 9) return "ดีเยี่ยม (Excellent) 🏆";
    if (score >= 7) return "ดี (Good) 🌟";
    if (score >= 5) return "พอใช้ (Fair) 👍";
    return "ควรปรับปรุง (Needs Improvement) 📖";
  }, [progress]);

  // --- ADMIN SPECIAL CAPABILITIES ---
  const [adminPanelData, setAdminPanelData] = useState({
    totalStudents: 0,
    averagePre: 0,
    averagePost: 0,
    completionRate: 0
  });

  useEffect(() => {
    const validStudents = leaderboard.filter(x => x.name !== "ผู้ดูแลระบบ");
    const total = validStudents.length;
    
    let sumPre = 0;
    let sumPost = 0;
    let countPost = 0;

    validStudents.forEach((st) => {
      sumPre += st.preTestScore >= 0 ? st.preTestScore : 0;
      if (st.postTestScore >= 0) {
        sumPost += st.postTestScore;
        countPost++;
      }
    });

    const avgPre = total > 0 ? Number((sumPre / total).toFixed(1)) : 0;
    const avgPost = countPost > 0 ? Number((sumPost / countPost).toFixed(1)) : 0;
    const completionPercent = total > 0 ? Math.round((countPost / total) * 100) : 0;

    setAdminPanelData({
      totalStudents: total,
      averagePre: avgPre,
      averagePost: avgPost,
      completionRate: completionPercent
    });
  }, [leaderboard]);

  // Helper to force unlock all features for developers / debuggers
  const unlockEverythingCheat = () => {
    setProgress((prev) => ({
      ...prev,
      preTestCompleted: true,
      preTestScore: 8,
      visitedTabs: [1, 2, 3, 4, 5, 6],
      matchGameScore: 8
    }));
    Swal.fire({
      icon: "success",
      title: "ปลดล็อกบทเรียนสำเร็จ!",
      text: "โหมดทดสอบและบทเรียนทุกหน้าได้รับการปลดล็อกชั่วคราวเพื่ออำนวยความสะดวกในการตรวจสอบระบบ",
      timer: 2000,
      showConfirmButton: false
    });
  };

  // --- LOGIN PAGE ---
  if (!isLoggedIn) {
    return (
      <div id="login-layout-wrapper" className="min-h-screen bg-tree-pattern flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
        {/* Natural Decoration Blobs from Vibrant Palette */}
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-green-200/40 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        <div className="absolute bottom-[-20px] left-[20%] w-48 h-48 bg-green-300/30 rounded-full blur-2xl -z-0 pointer-events-none"></div>

        {/* Abstract Tree Background Decorations */}
        <div className="absolute top-10 left-5 text-7xl opacity-15 pointer-events-none select-none">🌳</div>
        <div className="absolute bottom-20 right-10 text-8xl opacity-15 pointer-events-none select-none">🌴</div>
        <div className="absolute top-1/2 right-1/4 text-6xl opacity-10 pointer-events-none select-none">🍃</div>
        <div className="absolute bottom-1/3 left-1/4 text-5xl opacity-10 pointer-events-none select-none">🌿</div>

        {/* TOP COMPONENT: ACADEMIC CREDENTIALS */}
        <header className="w-full max-w-4xl mx-auto text-center mt-4 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-xs md:text-sm font-semibold mb-3 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            บทเรียนออนไลน์วิชาชีพสำหรับ ปวช.
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight">
            วิชา <span className="text-green-700">21910-2001 ระบบปฏิบัติการคอมพิวเตอร์</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mt-2 font-medium">
            บทเรียนคอมพิวเตอร์อัจฉริยะ เรื่อง: <span className="underline decoration-green-500 decoration-3">ฮาร์ดแวร์ (Hardware Components)</span>
          </p>
        </header>

        {/* MIDDLE COMPONENT: SIGN IN FORM */}
        <main className="w-full max-w-md mx-auto my-8 z-10">
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-xl p-6 md:p-8 relative overflow-hidden border-t-4 border-t-green-600 hover-lift border border-white">
            {/* Shine Animation overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                <Cpu className="w-9 h-9 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">ลงทะเบียนเข้าสู่ระบบ</h2>
            <p className="text-xs text-center text-slate-500 mb-6">
              ระบุตัวตนและบทบาทของท่านเพื่อวิเคราะห์ระดับการประเมินและเก็บสถิติ
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Name input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-green-600" /> ชื่อ - นามสกุล ผู้เรียน:
                </label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: นายสมหมาย มั่นใจยิ่ง"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/95 text-slate-800 shadow-sm"
                  required
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-green-600" /> ระดับสิทธิ์เข้าใช้งาน:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      role === "student"
                        ? "border-green-600 bg-green-50 text-green-800 shadow-sm"
                        : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>ปวช. นักเรียน</span> 🎓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      role === "admin"
                        ? "border-green-600 bg-green-50 text-green-800 shadow-sm"
                        : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>ผู้ดูแลระบบ</span> 🧑‍🏫
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-md hover:shadow-green-700/20 transition-all duration-200 text-base"
              >
                เข้าสู่ห้องเรียนคอมพิวเตอร์ →
              </button>
            </form>

            {/* Quick system bypass tool for evaluation */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button 
                onClick={() => {
                  setStudentName("อาจารย์ ธิติมาร์ ผู้ทดสอบ");
                  setRole("admin");
                  setIsLoggedIn(true);
                  setProgress({
                    name: "อาจารย์ ธิติมาร์ ผู้ทดสอบ",
                    role: "admin",
                    preTestCompleted: true,
                    preTestScore: 9,
                    postTestCompleted: true,
                    postTestScore: 10,
                    currentProgress: "เรียนจบ",
                    visitedTabs: [1,2,3,4,5,6],
                    matchGameScore: 8,
                    timestamp: "13/07/2026"
                  });
                  setActiveSection("tab-1");
                  Swal.fire({
                    icon: "info",
                    title: "เปิดสิทธิ์ผู้ทดสอบระบบพิเศษ",
                    text: "ปลดล็อกทุกด่านและบทเรียนเรียบร้อยเพื่ออำนวยความสะดวกค่ะ",
                    timer: 2000,
                    showConfirmButton: false
                  });
                }}
                className="text-[11px] text-slate-400 hover:text-green-600 underline"
              >
                ⚡ บายพาสระบบเป็น Admin (ปลดล็อกเนื้อหาทันที)
              </button>
            </div>
          </div>
        </main>

        {/* BOTTOM SECTION: LEADERBOARD WITH REAL-TIME FILTER */}
        <section id="global-leaderboard" className="w-full max-w-4xl mx-auto my-4 bg-white/80 backdrop-blur-xl rounded-[32px] border border-white p-6 md:p-8 shadow-xl relative overflow-hidden z-10">
          {/* Shine Animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500 animate-bounce" /> 
                ทำเนียบคะแนนผู้เรียนยอดเยี่ยม (Leaderboard)
              </h3>
              <p className="text-xs text-slate-500">
                สถิตินักศึกษาที่ประเมินผลหลังเรียน (Post-test) สูงสุดแบบเรียลไทม์
              </p>
            </div>
            
            {/* Search inputs */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="พิมพ์ค้นหารายชื่อเพื่อนในนี้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl relative z-10">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-green-50/50 border-b border-green-100 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-center">อันดับ</th>
                  <th className="py-3 px-4">ชื่อ-สกุล นักเรียน</th>
                  <th className="py-3 px-4 text-center">ก่อนเรียน (Pre)</th>
                  <th className="py-3 px-4 text-center">หลังเรียน (Post)</th>
                  <th className="py-3 px-4 text-center">ดัชนีพัฒนาการ</th>
                  <th className="py-3 px-4 text-center">เวลาเรียนสะสม</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                      ❌ ไม่พบคะแนนของนักเรียนที่ระบุในระบบ
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <tr 
                        key={index} 
                        className="border-b border-slate-100/70 hover:bg-green-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">🥇</span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-white text-xs font-bold shadow-xs">🥈</span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/60 text-white text-xs font-bold shadow-xs">🥉</span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500">#{rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{entry.name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">{entry.preTestScore}/10</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-green-700">
                          {entry.postTestScore >= 0 ? `${entry.postTestScore}/10` : "ยังไม่ได้สอบ"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            entry.improvement.startsWith("+") 
                              ? "bg-green-100 text-green-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {entry.improvement}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600 text-xs">
                          {formatDuration(entry.totalStudyTime)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                            entry.status === "เรียนจบ"
                              ? "bg-green-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full text-center py-4 text-slate-400 text-xs border-t border-slate-200/50 mt-8">
          <p>© 2026 Copyright | พัฒนาโดย Thitima Kerdmoung | 21910-2001 ระบบปฏิบัติการคอมพิวเตอร์</p>
        </footer>
      </div>
    );
  }

  // --- LESSON STUDY MODE LAYOUT (SIDEBAR LEFT + CONTENT RIGHT) ---
  return (
    <div className="min-h-screen bg-tree-pattern flex flex-col md:flex-row relative overflow-hidden">
      {/* Natural Decoration Blobs from Vibrant Palette */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-green-200/40 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-[-20px] left-[20%] w-48 h-48 bg-green-300/30 rounded-full blur-2xl pointer-events-none -z-0"></div>

      {/* Absolute floating leaves in background */}
      <div className="absolute top-24 right-10 text-6xl opacity-5 pointer-events-none select-none">🌲</div>
      <div className="absolute bottom-20 left-1/4 text-8xl opacity-5 pointer-events-none select-none font-mono">🌿</div>

      {/* --- SIDEBAR PANEL (LEFT) --- */}
      <aside className="w-full md:w-80 bg-green-700 text-white flex flex-col shrink-0 relative z-10 shadow-2xl">
        {/* Sidebar Header Info */}
        <div className="p-6 bg-green-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-lg">
              <Cpu className="w-6 h-6 text-green-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight tracking-tight text-white">🖥️ บทเรียนออนไลน์</h2>
              <span className="text-[10px] text-green-200 font-mono tracking-widest uppercase block mt-0.5">ระบบปฏิบัติการคอมพิวเตอร์</span>
            </div>
          </div>
        </div>

        {/* Student Session Details Card */}
        <div className="mx-4 my-4 flex items-center space-x-3 p-3 bg-green-600/50 rounded-xl border border-white/10">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl shrink-0">👤</div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] text-green-200">นักเรียนระดับ ปวช.</p>
            <p className="text-sm font-medium leading-none truncate text-white">{studentName}</p>
          </div>
          <div className="shrink-0">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
              progress.currentProgress === "เรียนจบ"
                ? "bg-green-500 text-slate-900"
                : progress.currentProgress === "กำลังเรียน"
                ? "bg-amber-400 text-slate-900 animate-pulse"
                : "bg-slate-500 text-white"
            }`}>
              {progress.currentProgress}
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-800">
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold px-2 mb-2">โครงสร้างห้องเรียน</p>
          
          {/* Pre Test tab */}
          <button
            onClick={() => setActiveSection("pre-test")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeSection === "pre-test"
                ? "bg-green-800 text-white shadow-lg border-l-4 border-green-300 transform scale-105"
                : "text-green-100 hover:bg-green-600 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> แบบทดสอบก่อนเรียน (10 ข้อ)
            </span>
            {progress.preTestCompleted ? (
              <span className="text-[10px] bg-green-900/50 text-green-200 px-2 py-0.5 rounded-full font-bold">ผ่านแล้ว</span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>

          <p className="text-[10px] text-green-200 uppercase tracking-widest font-extrabold px-2 pt-4 mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> หน่วยความรู้ 6 แท็ป
          </p>

          {/* Content tabs */}
          {contentTabs.map((tab) => {
            const isTabUnlocked = progress.preTestCompleted;
            const isTabVisited = progress.visitedTabs.includes(tab.id);

            return (
              <button
                key={tab.id}
                disabled={!isTabUnlocked}
                onClick={() => {
                  setActiveSection(`tab-${tab.id}`);
                  handleTabVisit(tab.id);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all duration-150 ${
                  activeSection === `tab-${tab.id}`
                    ? "bg-green-800 text-white font-bold shadow-lg border-l-4 border-green-300 transform scale-105"
                    : !isTabUnlocked
                    ? "opacity-40 text-green-300 cursor-not-allowed"
                    : "text-green-100 hover:bg-green-600 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {!isTabUnlocked ? (
                    <Lock className="w-3.5 h-3.5 text-green-300 shrink-0" />
                  ) : isTabVisited ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-300 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-green-300 shrink-0"></div>
                  )}
                  <span className="truncate">{tab.title}</span>
                </span>
                {isTabUnlocked && tab.id >= 5 && (
                  <span className="text-[8px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-sm font-extrabold flex items-center gap-0.5">
                    <Tv className="w-2 h-2" /> VDO
                  </span>
                )}
              </button>
            );
          })}

          <p className="text-[10px] text-green-200 uppercase tracking-widest font-extrabold px-2 pt-4 mb-2">กิจกรรมและประเมินหลัก</p>

          {/* Game Tab */}
          <button
            disabled={!progress.preTestCompleted}
            onClick={() => setActiveSection("game")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeSection === "game"
                ? "bg-green-800 text-white shadow-lg border-l-4 border-green-300 transform scale-105"
                : !progress.preTestCompleted
                ? "opacity-40 text-green-300 cursor-not-allowed"
                : "text-green-100 hover:bg-green-600 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-400" /> เกมจับคู่ฮาร์ดแวร์
            </span>
            {progress.preTestCompleted && progress.matchGameScore > 0 ? (
              <span className="text-[9px] text-green-200 font-mono font-bold">สำเร็จ (8/8)</span>
            ) : progress.preTestCompleted ? (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            ) : null}
          </button>

          {/* Post Test Tab */}
          <button
            disabled={!progress.preTestCompleted}
            onClick={() => setActiveSection("post-test")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeSection === "post-test"
                ? "bg-green-800 text-white shadow-lg border-l-4 border-green-300 transform scale-105"
                : !progress.preTestCompleted
                ? "opacity-40 text-green-300 cursor-not-allowed"
                : "text-green-100 hover:bg-green-600 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-green-300" /> แบบทดสอบหลังเรียน (10 ข้อ)
            </span>
            {progress.postTestCompleted ? (
              <span className="text-[9px] text-green-200 font-mono font-bold">สอบแล้ว ({progress.postTestScore}/10)</span>
            ) : progress.preTestCompleted ? (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            ) : null}
          </button>

          {/* Performance Report Tab */}
          <button
            disabled={!progress.postTestCompleted}
            onClick={() => setActiveSection("dashboard")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeSection === "dashboard"
                ? "bg-green-800 text-white shadow-lg border-l-4 border-green-300 transform scale-105"
                : !progress.postTestCompleted
                ? "opacity-40 text-green-300 cursor-not-allowed"
                : "text-green-100 hover:bg-green-600 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-300" /> สรุปผลและการพัฒนา
            </span>
            {progress.postTestCompleted ? (
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : null}
          </button>

          {/* ADMIN OVERVIEW TAB - ONLY VISIBLE TO ADMINS */}
          {role === "admin" && (
            <>
              <p className="text-[10px] text-green-200 uppercase tracking-widest font-extrabold px-2 pt-4 mb-2">หน้าต่างผู้ประเมินผล</p>
              <button
                onClick={() => setActiveSection("admin-panel")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all duration-150 border border-green-600/30 ${
                  activeSection === "admin-panel"
                    ? "bg-amber-500 text-slate-950 font-bold border-l-4 border-amber-300 transform scale-105"
                    : "text-amber-200 hover:bg-green-600"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" /> แผงควบคุมผู้ดูแล (Admin)
                </span>
                <span className="bg-amber-600 text-[9px] text-white px-2 py-0.5 rounded-full font-bold">
                  {adminPanelData.totalStudents} คน
                </span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer Buttons */}
        <div className="p-4 border-t border-green-800 bg-green-800/40 flex flex-col gap-2">
          {/* Cheat tool to help user review */}
          {!progress.preTestCompleted && (
            <button
              onClick={unlockEverythingCheat}
              className="w-full text-center py-1.5 px-3 rounded-lg bg-green-800/50 hover:bg-green-800 text-[10px] text-green-200 font-bold transition-colors border border-green-600/20"
            >
              🛠️ ทางลัด: ปลดล็อกด่านทั้งหมด
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-red-500/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบเรียนรู้
          </button>
        </div>
      </aside>

      {/* --- CONTENT WORKSPACE (RIGHT) --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-0 flex flex-col justify-between max-w-7xl mx-auto w-full">
        <div className="flex-1 pb-10">
          
          {/* HEADER */}
          <header className="mb-6 p-4 md:p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
            <div>
              <span className="bg-green-100 text-green-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-1 inline-block">รหัสวิชา 21910-2001</span>
              <h2 className="text-xl md:text-2xl font-black text-green-900">📂 หัวข้อ: ฮาร์ดแวร์คอมพิวเตอร์</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold">ความก้าวหน้าการเรียน</p>
                <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-extrabold text-sm border-4 border-white shadow-md shrink-0">
                {progressPercent}%
              </div>
            </div>
          </header>

          {/* LOADING SCREEN INNER OVERLAY */}
          {isLoading && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 max-w-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-slate-800 font-bold text-base">{loadingMessage}</p>
                <p className="text-slate-400 text-xs mt-1">กรุณารอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูลชีตอัจฉริยะ...</p>
              </div>
            </div>
          )}

          {/* --- VIEW 1: PRE TEST SECTION --- */}
          {activeSection === "pre-test" && (
            <div id="pretest-panel" className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden">
              {/* Shine Animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">📝</div>
              
              {!isQuizStarted && !progress.preTestCompleted ? (
                <div className="text-center max-w-2xl mx-auto py-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mx-auto mb-4 border border-green-200">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">ทำแบบทดสอบก่อนเรียน (Pre-test)</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    ก่อนเริ่มเรียนบทเรียนหน่วย "ฮาร์ดแวร์คอมพิวเตอร์" ขอให้นักศึกษาประเมินความรู้เบื้องต้นของตนเองก่อนนะครับ แบบทดสอบนี้มีทั้งหมด 10 ข้อ มีระบบตัวจับเวลารายข้อ ข้อละ 20 วินาที เมื่อหมดเวลาจะถือว่าไม่ได้คะแนนข้อนั้นและเฉลยทันทีนะครับ!
                  </p>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs md:text-sm text-left mb-6 space-y-2">
                    <p className="font-bold">⚠️ ข้อกำหนดหลักสูตร ปวช. :</p>
                    <p>• นักเรียนต้องทำแบบทดสอบก่อนเรียนนี้ให้เสร็จสมบูรณ์เสียก่อน ระบบจึงจะปลดล็อกหน่วยความรู้ และเกมการศึกษาต่าง ๆ ให้เข้าไปเรียนรู้ได้</p>
                  </div>
                  <button
                    onClick={() => startQuiz("pre")}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:scale-105 transition-all text-base flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-5 h-5 fill-current" /> เริ่มทำแบบทดสอบจับเวลา 20 วินาที
                  </button>
                </div>
              ) : progress.preTestCompleted && !isQuizStarted ? (
                <div className="text-center max-w-xl mx-auto py-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">คุณทำแบบทดสอบก่อนเรียนเสร็จสิ้นแล้ว</h3>
                  <p className="text-slate-500 text-sm mb-4">สถิติประเมินความรู้แรกเริ่มวิชาระบบปฏิบัติการคอมพิวเตอร์</p>
                  
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">คะแนนก่อนเรียนที่ได้</p>
                    <p className="text-4xl font-black text-green-800 mt-1">{progress.preTestScore} / 10</p>
                    <p className="text-xs text-slate-500 mt-1">คะแนนถูกบันทึกลง Google Sheets เรียบร้อยแล้ว</p>
                  </div>

                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    ยินดีด้วยครับ ขณะนี้ระบบได้ปลดล็อกเนื้อหาทั้ง 6 แท็ปเรียบร้อยแล้ว กรุณาคลิกศึกษาที่ แถบเมนูด้านซ้าย เพื่อเก็บเกี่ยวทักษะก่อนที่จะมาประเมินสอบหลังเรียนนะครับ!
                  </p>

                  <button
                    onClick={() => {
                      setActiveSection("tab-1");
                      handleTabVisit(1);
                    }}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-all hover:translate-x-1"
                  >
                    เข้าศึกษาบทเรียนแท็ปที่ 1 <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // ACTIVE QUIZ RUNNING (PRE-TEST)
                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-xs text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2.5 py-1 rounded-full">
                        กำลังทำ: แบบทดสอบก่อนเรียน
                      </span>
                      <h4 className="text-sm text-slate-400 mt-1 font-semibold">คำถามข้อที่ {currentQuestionIndex + 1} จากทั้งหมด 10 ข้อ</h4>
                    </div>

                    {/* TIMER CLOCK RING */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                      <span className={`font-mono text-xl font-black ${quizTimer <= 5 ? 'text-red-500 animate-ping' : 'text-slate-700'}`}>
                        {quizTimer} วินาที
                      </span>
                    </div>
                  </div>

                  {/* TIMER PROGRESS BAR */}
                  <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        quizTimer <= 5 ? 'bg-red-500' : quizTimer <= 10 ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${(quizTimer / 20) * 100}%` }}
                    ></div>
                  </div>

                  {/* QUESTION COMPONENT */}
                  <div className="bg-green-50/50 rounded-2xl p-5 border border-green-100 mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed">
                      {shuffledQuestions[currentQuestionIndex]?.text}
                    </h3>
                  </div>

                  {/* MULTIPLE CHOICES (ONE-BY-ONE CLICK ACTION) */}
                  <div className="grid grid-cols-1 gap-3.5">
                    {shuffledQuestions[currentQuestionIndex]?.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSubmit(idx)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-green-500 hover:bg-green-50/30 font-semibold text-slate-700 text-sm md:text-base transition-all duration-150 hover-lift shadow-sm flex justify-between items-center"
                      >
                        <span>{option}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="text-center text-[11px] text-slate-400 mt-6 font-mono">
                    กรุณาคลิกเลือกข้อที่ถูกต้องทันที ระบบจะเฉลยผลและบันทึกคะแนนสะสมทีละข้อ
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- VIEW 2: CONTENT TABS 1 TO 6 --- */}
          {contentTabs.map((tab) => {
            const isTabActive = activeSection === `tab-${tab.id}`;
            if (!isTabActive) return null;

            return (
              <div 
                key={tab.id} 
                id={`tab-panel-${tab.id}`} 
                className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden"
              >
                {/* Shine Animation overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>

                {/* Visual Glass Shine and Top Colored Bar */}
                <div className={`h-2.5 w-full absolute top-0 left-0 ${tab.badgeColor}`}></div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6 relative z-10">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-2 ${tab.badgeColor}`}>
                      วัตถุประสงค์บทเรียน ปวช.
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 leading-tight">
                      🎯 {tab.objective}
                    </h3>
                  </div>
                  
                  {/* Floating Large Emojis / Decorative Character */}
                  <div className="text-4xl md:text-5xl shrink-0 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-xs">
                    {tab.emoji}
                  </div>
                </div>

                {/* SHINE CARD HERO STATEMENT */}
                <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/60 border border-green-200/50 mb-6 relative hover-lift z-10">
                  <div className="absolute top-2 right-2 text-xs text-green-600 font-mono font-bold">VIBRANT CARD</div>
                  <h4 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-green-600 shrink-0" /> สาระแก่นความรู้พื้นฐาน:
                  </h4>
                  <p className="text-slate-700 text-sm md:text-base whitespace-pre-line leading-relaxed">
                    {tab.content}
                  </p>
                </div>

                {/* INSTRUCTIONAL VIDEO FOR TAB 5 & 6 */}
                {tab.videoUrl && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Tv className="w-5 h-5 text-sky-500 shrink-0" /> วิดีโอสื่อประสมทัศน์การเรียนรู้ (ปรับระดับความเร็วและรับฟังเสียงได้):
                    </h4>
                    
                    <div className="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200">
                      <iframe
                        className="w-full h-full"
                        src={tab.videoUrl}
                        title="Computer Hardware Lesson Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-2">
                      💡 วิดีโอสตรีมรองรับเครื่องเล่นภายนอก สามารถหยุดชั่วคราว, กรอความเร็ว หรือปรับซับไตเติลภาษาได้เต็มรูปแบบ
                    </div>
                  </div>
                )}

                {/* BOTTOM COMPANION QUESTION શવંતคิด */}
                <div className="mt-6 bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex gap-3.5">
                  <div className="text-2xl shrink-0">💡</div>
                  <div>
                    <h5 className="text-sm font-bold text-amber-900">คำถามชวนคิดเพื่ออาชีพ:</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      หากระบบปฏิบัติการคอมพิวเตอร์ของคุณมีปัญหากระตุกขณะเรียกใช้โปรแกรมหลายโปรแกรมพร้อมกัน จากหัวข้อนี้ คิดว่าควรเลือกอัปเกรดความจุแรม หรือซื้อพาวเวอร์ซัพพลายใหม่จึงจะแก้ปัญหาตรงจุดที่สุดครับ?
                    </p>
                  </div>
                </div>

                {/* PROGRESS FLOW STEP BUTTONS */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center relative z-10">
                  <span className="text-xs text-slate-500 font-semibold">ศึกษาแท็ป {tab.id} สำเร็จแล้ว</span>
                  
                  {tab.id < 6 ? (
                    <button
                      onClick={() => {
                        const nextId = tab.id + 1;
                        setActiveSection(`tab-${nextId}`);
                        handleTabVisit(nextId);
                      }}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:translate-x-1 shadow-md hover:shadow-green-200"
                    >
                      ศึกษาบทถัดไป: แท็ปที่ {tab.id + 1} <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveSection("game")}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-md"
                    >
                      <Gamepad2 className="w-4 h-4" /> ไปลุยกิจกรรม "เกมจับคู่ฮาร์ดแวร์"กันเถอะ!
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* --- VIEW 3: HARDWARE MATCHING GAME SECTION --- */}
          {activeSection === "game" && (
            <div id="game-panel" className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden">
              {/* Shine Animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">🎮</div>
              
              <div className="pb-4 border-b border-slate-100 mb-6 relative z-10">
                <span className="text-xs text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full">
                  มัลติมีเดียสื่อการประเมิน
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  🎮 เกมจับคู่จำแนกประเภทฮาร์ดแวร์คอมพิวเตอร์
                </h3>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  ให้นักศึกษาจับคู่จัดหมวดหมู่ให้กับอุปกรณ์ฮาร์ดแวร์ให้ตรงตามหน่วยการทำงาน (Input, Process, Output, Storage) ทั้ง 4 หน่วย
                </p>
              </div>

              {/* GAME STATS DISPLAY */}
              <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">จับคู่สำเร็จแล้ว</div>
                  <div className="text-xl md:text-2xl font-black text-green-600">
                    {Object.keys(matchedPairs).length} / 8 ชิ้น
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">จำนวนครั้งที่พยายาม</div>
                  <div className="text-xl md:text-2xl font-black text-slate-700">
                    {gameMoves} ครั้ง
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ความแม่นยำทางสถาปัตยกรรม</div>
                  <div className="text-xl md:text-2xl font-black text-blue-600">
                    {gameMoves > 0 ? `${Math.round((Object.keys(matchedPairs).length / gameMoves) * 100)}%` : "100%"}
                  </div>
                </div>
              </div>

              {/* INTERACTIVE GAME BOARD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
                
                {/* LEFT COLUMN: UNSORTED HARDWARE LIST (8 Items) */}
                <div className="lg:col-span-5 space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <span>📦 รายชื่ออุปกรณ์ฮาร์ดแวร์:</span>
                  </h4>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                    {gameItems.map((item) => {
                      const isMatched = matchedPairs[item.id] !== undefined;
                      const isSelected = selectedGameItem === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          disabled={isMatched}
                          onClick={() => selectGameItem(item.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all text-xs font-bold relative hover-lift flex flex-col justify-between ${
                            isMatched
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                              : isSelected
                              ? "border-green-500 bg-green-50 text-green-800 scale-95 shadow-sm ring-2 ring-green-500/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-green-400"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{item.name}</span>
                            {isMatched && <span className="text-green-500 text-xs">✔️ ถูกต้อง</span>}
                          </div>
                          {!isMatched && (
                            <span className="text-[10px] text-slate-400 font-normal mt-1 block">
                              {item.description}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    👉 <b>วิธีเล่น:</b> คลิกเลือกการ์ดฮาร์ดแวร์ด้านบน 1 ชิ้นให้ขึ้นไฮไลท์สีเขียว จากนั้นไปคลิกที่ปุ่มกลุ่มขวามือเพื่อย้ายหมวดหมู่ให้สอดคล้องกัน
                  </p>
                </div>

                {/* RIGHT COLUMN: 4 CATEGORIES TARGETS */}
                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Category Target 1: Input Unit */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/50 flex flex-col justify-between min-h-[160px] hover-lift">
                    <div>
                      <h5 className="font-extrabold text-sm text-indigo-900 flex items-center justify-between">
                        <span>📥 1. หน่วยรับข้อมูล (Input)</span>
                      </h5>
                      <p className="text-[10px] text-indigo-600 mb-2">รับข้อมูลภายนอกแปลงเป็นรหัสดิจิทัล</p>
                      
                      {/* Matched items lists */}
                      <div className="space-y-1 mb-4">
                        {Object.entries(matchedPairs)
                          .filter(([_, cat]) => cat === "input")
                          .map(([id]) => {
                            const name = gameItems.find(x => x.id === id)?.name;
                            return (
                              <div key={id} className="bg-white/80 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-900 border border-indigo-100">
                                🔹 {name}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlaceInCategory("input")}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                    >
                      วางกลุ่มนี้ 🎯
                    </button>
                  </div>

                  {/* Category Target 2: Process Unit */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/50 flex flex-col justify-between min-h-[160px] hover-lift">
                    <div>
                      <h5 className="font-extrabold text-sm text-amber-900 flex items-center justify-between">
                        <span>⚙️ 2. หน่วยประมวลผล (Process)</span>
                      </h5>
                      <p className="text-[10px] text-amber-600 mb-2">วิเคราะห์คำสั่งทางคณิตศาสตร์-ตรรกศาสตร์</p>
                      
                      {/* Matched items lists */}
                      <div className="space-y-1 mb-4">
                        {Object.entries(matchedPairs)
                          .filter(([_, cat]) => cat === "process")
                          .map(([id]) => {
                            const name = gameItems.find(x => x.id === id)?.name;
                            return (
                              <div key={id} className="bg-white/80 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 border border-amber-100">
                                🔹 {name}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlaceInCategory("process")}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                    >
                      วางกลุ่มนี้ 🎯
                    </button>
                  </div>

                  {/* Category Target 3: Output Unit */}
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/50 flex flex-col justify-between min-h-[160px] hover-lift">
                    <div>
                      <h5 className="font-extrabold text-sm text-rose-900 flex items-center justify-between">
                        <span>📤 3. หน่วยแสดงผลลัพธ์ (Output)</span>
                      </h5>
                      <p className="text-[10px] text-rose-600 mb-2">แปลงสารสนเทศให้มนุษย์สัมผัสได้</p>
                      
                      {/* Matched items lists */}
                      <div className="space-y-1 mb-4">
                        {Object.entries(matchedPairs)
                          .filter(([_, cat]) => cat === "output")
                          .map(([id]) => {
                            const name = gameItems.find(x => x.id === id)?.name;
                            return (
                              <div key={id} className="bg-white/80 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-900 border border-rose-100">
                                🔹 {name}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlaceInCategory("output")}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                    >
                      วางกลุ่มนี้ 🎯
                    </button>
                  </div>

                  {/* Category Target 4: Storage Unit */}
                  <div className="p-4 rounded-2xl bg-green-50/70 border border-green-200/50 flex flex-col justify-between min-h-[160px] hover-lift">
                    <div>
                      <h5 className="font-extrabold text-sm text-green-900 flex items-center justify-between">
                        <span>💾 4. หน่วยจัดเก็บ (Storage)</span>
                      </h5>
                      <p className="text-[10px] text-green-600 mb-2">บันทึกข้อมูลและระบบปฏิบัติการถาวร</p>
                      
                      {/* Matched items lists */}
                      <div className="space-y-1 mb-4">
                        {Object.entries(matchedPairs)
                          .filter(([_, cat]) => cat === "storage")
                          .map(([id]) => {
                            const name = gameItems.find(x => x.id === id)?.name;
                            return (
                              <div key={id} className="bg-white/80 px-2.5 py-1 rounded-lg text-xs font-bold text-green-900 border border-green-100">
                                🔹 {name}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlaceInCategory("storage")}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold"
                    >
                      วางกลุ่มนี้ 🎯
                    </button>
                  </div>

                </div>

              </div>

              {/* GAME RESET OR PLAY AGAIN */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={initMatchingGame}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตตั้งต้นเล่นใหม่
                </button>

                {gameFinished ? (
                  <button
                    onClick={() => setActiveSection("post-test")}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce shadow-md"
                  >
                    <span>ผ่านด่านแล้ว! ไปทำ "แบบทดสอบหลังเรียน" กันต่อ</span> <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">
                    จัดหมวดหมู่ให้ครบถ้วนทั้ง 8 รายการด้านซ้ายเพื่อผ่านด่าน
                  </span>
                )}
              </div>
            </div>
          )}

          {/* --- VIEW 4: POST TEST SECTION --- */}
          {activeSection === "post-test" && (
            <div id="posttest-panel" className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden">
              {/* Shine Animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">🏆</div>
              
              {!isQuizStarted && !progress.postTestCompleted ? (
                <div className="text-center max-w-2xl mx-auto py-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">ทำแบบทดสอบหลังเรียน (Post-test)</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    เมื่อนักศึกษาได้เรียนรู้เนื้อหาทางฮาร์ดแวร์ครบทั้ง 6 หมวด และทบทวนด้วยสื่อการเรียนรู้เกมนิยมแล้ว ขั้นตอนนี้คือการสอบประเมินสัมฤทธิผลท้ายบทเรียน มีคำถามจำนวน 10 ข้อ (ตัวคำถามเดิมกับก่อนเรียนแต่ทำการสลับสุ่มตำแหน่งตัวเลือก) ข้อละ 20 วินาที เพื่อทดสอบพัฒนาการและประมวลผลขึ้นรายงานความก้าวหน้าครับ
                  </p>
                  
                  <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs text-left mb-6">
                    🚨 <b>หมายเหตุและสิทธิ:</b> เมื่อกดเริ่มต้นแล้ว ต้องทำการประเมินให้เสร็จสิ้นโดยห้ามปิดหรือรีเฟรชหน้าเบราว์เซอร์ เพื่อให้ระบบ AppScript ส่งรายงานผลเข้าระบบได้อย่างแม่นยำ
                  </div>

                  <button
                    onClick={() => startQuiz("post")}
                    className="px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:scale-105 transition-all text-base flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-5 h-5 fill-current" /> เริ่มทำแบบทดสอบวัดผลหลังเรียน
                  </button>
                </div>
              ) : progress.postTestCompleted && !isQuizStarted ? (
                <div className="text-center max-w-xl mx-auto py-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">สำเร็จการประเมินประสมแล้ว!</h3>
                  <p className="text-slate-500 text-sm mb-4">ประวัติการพัฒนาและการเปรียบเทียบถูกประมวลผลเรียบร้อย</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">คะแนนสอบก่อนเรียน</p>
                      <p className="text-2xl font-extrabold text-slate-700 mt-1">{progress.preTestScore} / 10</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                      <p className="text-xs text-green-600 font-bold uppercase tracking-wider">คะแนนสอบหลังเรียน</p>
                      <p className="text-2xl font-extrabold text-green-800 mt-1">{progress.postTestScore} / 10</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    ระบบได้คำนวณการพัฒนาเชิงสัมบูรณ์ของนักศึกษา และส่งรายงานเข้าสู่ระบบชีต Google เรียบร้อยแล้ว
                  </p>

                  <button
                    onClick={() => setActiveSection("dashboard")}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-all hover:scale-105"
                  >
                    ไปตรวจสอบรายงานพัฒนาการ <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // ACTIVE QUIZ RUNNING (POST-TEST)
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-xs text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full">
                        กำลังทำ: แบบทดสอบหลังเรียน
                      </span>
                      <h4 className="text-sm text-slate-400 mt-1 font-semibold">คำถามข้อที่ {currentQuestionIndex + 1} จากทั้งหมด 10 ข้อ</h4>
                    </div>

                    {/* TIMER CLOCK */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500 animate-spin" />
                      <span className={`font-mono text-xl font-black ${quizTimer <= 5 ? 'text-red-500 animate-ping' : 'text-slate-700'}`}>
                        {quizTimer} วินาที
                      </span>
                    </div>
                  </div>

                  {/* TIMER PROGRESS BAR */}
                  <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        quizTimer <= 5 ? 'bg-red-500' : quizTimer <= 10 ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${(quizTimer / 20) * 100}%` }}
                    ></div>
                  </div>

                  {/* QUESTION COMPONENT */}
                  <div className="bg-green-50/50 rounded-2xl p-5 border border-green-100 mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed">
                      {shuffledQuestions[currentQuestionIndex]?.text}
                    </h3>
                  </div>

                  {/* MULTIPLE CHOICES (SHUFFLED INDICES MAP ON RUNTIME) */}
                  <div className="grid grid-cols-1 gap-3.5">
                    {shuffledOptionsMap[currentQuestionIndex]?.map((originalIdx, currentShuffledIdx) => {
                      const optionText = shuffledQuestions[currentQuestionIndex]?.options[originalIdx];
                      return (
                        <button
                          key={currentShuffledIdx}
                          onClick={() => handleAnswerSubmit(currentShuffledIdx)}
                          className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-green-500 hover:bg-green-50/30 font-semibold text-slate-700 text-sm md:text-base transition-all duration-150 hover-lift shadow-sm flex justify-between items-center"
                        >
                          <span>{optionText}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center text-[11px] text-slate-400 mt-6 font-mono">
                    ตัวเลือกได้รับการสุ่มเรียงลำดับใหม่เพื่อวัดวิจารณญาณที่แท้จริง
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- VIEW 5: PERFORMANCE GROWTH ANALYSIS DASHBOARD --- */}
          {activeSection === "dashboard" && (
            <div id="student-report-panel" className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden">
              {/* Shine Animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">📊</div>
              
              <div className="pb-4 border-b border-slate-100 mb-6 relative z-10">
                <span className="text-xs text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2.5 py-1 rounded-full">
                  วิเคราะห์สารสนเทศผู้เรียนรายบุคคล
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  📊 รายงานระดับสติปัญญาและความก้าวหน้าของฉัน
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  ตรวจสอบระดับสัมฤทธิผลเปรียบเทียบระหว่างก่อนเรียนและหลังเรียน
                </p>
              </div>

              {/* STATS TILES */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 relative z-10">
                
                {/* Pre Test Tile */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs hover-lift">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">คะแนนทดสอบก่อนเรียน</span>
                  <div className="text-3xl font-black text-slate-700 mt-1">{progress.preTestScore} / 10</div>
                  <p className="text-xs text-slate-400 mt-2">ระดับพื้นฐานสติปัญญาเดิม</p>
                </div>

                {/* Post Test Tile */}
                <div className="p-5 rounded-2xl bg-green-50 border border-green-100 shadow-xs hover-lift">
                  <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest">คะแนนทดสอบหลังเรียน</span>
                  <div className="text-3xl font-black text-green-700 mt-1">{progress.postTestScore} / 10</div>
                  <p className="text-xs text-green-500 mt-2">สัมฤทธิภาพหลังเรียนรู้จริง</p>
                </div>

                {/* Growth/Improvement */}
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 shadow-xs hover-lift">
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">พัฒนาการเรียนรู้</span>
                  <div className="text-3xl font-black text-blue-700 mt-1 flex items-center gap-1">
                    {progress.postTestScore - progress.preTestScore >= 0 ? "+" : ""}
                    {(progress.postTestScore - progress.preTestScore) * 10}%
                  </div>
                  <p className="text-xs text-blue-500 mt-2">อัตราเพิ่มขึ้นเชิงทักษะวิทยาการ</p>
                </div>

                {/* Quality Grade */}
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 shadow-xs hover-lift">
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">ระดับผลการเรียนรวม</span>
                  <div className="text-sm font-black text-amber-800 mt-2 truncate">
                    {gradeLabel}
                  </div>
                  <p className="text-xs text-amber-500 mt-2">ประเมินสากลระบบการศึกษา</p>
                </div>

              </div>

              {/* --- TIME TRACKER SECTION --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
                {/* Login Time */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-xs hover-lift flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest block font-mono">เวลาเข้าเรียนล่าสุด</span>
                    <span className="text-sm font-black text-emerald-800 block">{progress.loginTime || "-"}</span>
                  </div>
                </div>

                {/* Logout Time */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 shadow-xs hover-lift flex items-center gap-3">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-widest block font-mono">เวลาออกจากบทเรียนล่าสุด</span>
                    <span className="text-sm font-black text-rose-800 block">{progress.logoutTime || "ยังไม่ออกจากบทเรียน"}</span>
                  </div>
                </div>

                {/* Total Time Spent */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-xs hover-lift flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest block font-mono">เวลาที่เข้าใช้งานทั้งหมด</span>
                    <span className="text-sm font-black text-indigo-800 block">{formatDuration(progress.totalStudyTime)}</span>
                  </div>
                </div>
              </div>

              {/* VISUAL CHARTS BAR COMPARISON */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* Visual Chart 1: Bar Comparison */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                    <span>📊 กราฟเปรียบเทียบคะแนน Pre-test VS Post-test</span>
                  </h4>

                  <div className="space-y-4 pt-4">
                    {/* Pre-test score bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>คะแนนสอบก่อนเรียน (Pre-test)</span>
                        <span>{progress.preTestScore} / 10 คะแนน</span>
                      </div>
                      <div className="w-full h-6 bg-slate-200 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-slate-400 font-mono text-[10px] text-white flex items-center justify-end pr-3 font-bold transition-all duration-1000"
                          style={{ width: `${progress.preTestScore * 10}%` }}
                        >
                          {progress.preTestScore > 0 ? `${progress.preTestScore * 10}%` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Post-test score bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-green-700 mb-1">
                        <span>คะแนนสอบหลังเรียน (Post-test)</span>
                        <span>{progress.postTestScore} / 10 คะแนน</span>
                      </div>
                      <div className="w-full h-6 bg-slate-200 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 font-mono text-[10px] text-white flex items-center justify-end pr-3 font-bold transition-all duration-1000"
                          style={{ width: `${progress.postTestScore * 10}%` }}
                        >
                          {progress.postTestScore > 0 ? `${progress.postTestScore * 10}%` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 mt-6 text-center">
                    *เกณฑ์การสอบผ่านตามหลักสูตรวิชาชีพระดับ ปวช. คือ 50% (5 คะแนนขึ้นไป)
                  </div>
                </div>

                {/* Visual Card 2: Interactive progress details and congratulations */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-green-800 to-green-950 text-green-50 flex flex-col justify-between hover-lift">
                  <div>
                    <span className="text-[9px] bg-green-700 text-green-300 font-extrabold uppercase px-2 py-0.5 rounded-full">
                      ยินดีด้วยคุณนักศึกษาวิชาชีพ ปวช.
                    </span>
                    <h4 className="text-xl font-bold text-white mt-2 mb-3">
                      🎖️ คุณทำกิจกรรมหลักสูตรฮาร์ดแวร์ครบ 100% แล้ว!
                    </h4>
                    <p className="text-xs text-green-200 leading-relaxed mb-4">
                      คุณได้รับการบันทึกสถานะการเรียนรู้เป็น <b>"เรียนจบ" (Completed)</b> อย่างเป็นระบบ มีการศึกษาบทเรียนวิชาชีพครบทั้ง 6 เรื่อง และทำกิจกรรมจับคู่กับคลังข้อสอบประเมินครบถ้วน
                    </p>
                  </div>

                  <div className="border-t border-green-800/80 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-green-400">สถานะบันทึกเครือข่าย:</p>
                      <p className="text-xs font-bold text-green-200">ID: 18I4yFbzkqGQNkdnKF_pU7kRadEs...</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        Swal.fire({
                          icon: "success",
                          title: "อัปเดตสถานะสำเร็จ",
                          text: "ทำการรีเฟรชข้อมูลและส่งสัญญาณบันทึกซ้ำลงคลังข้อมูล App Script เรียบร้อย!",
                          timer: 1500,
                          showConfirmButton: false
                        });
                        syncToGoogleSheets(
                          studentName + " (ปวช.)",
                          progress.preTestScore,
                          progress.postTestScore,
                          "เรียนจบ",
                          `+${(progress.postTestScore - progress.preTestScore) * 10}%`
                        );
                      }}
                      className="p-2 bg-green-800 hover:bg-green-700 rounded-xl text-green-200 hover:text-white transition-colors animate-pulse"
                      title="Sync data now"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    </button>
                  </div>
                </div>

              </div>

              {/* ACTION BACK TO LEADERBOARD */}
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    // Quick confirmation using SweetAlert
                    Swal.fire({
                      icon: "info",
                      title: "สอบเสร็จแล้ว สามารถกลับไปดูสถิติได้",
                      text: "คุณสามารถล็อกเอาต์เพื่อสลับบัญชีให้เพื่อนมาทำแบบทดสอบเพื่อดูสถิติเปรียบเทียบในหน้านั้นได้นะ!",
                      confirmButtonText: "รับทราบครับ",
                      confirmButtonColor: "#16a34a"
                    });
                  }}
                  className="px-6 py-3 border border-green-600 text-green-700 hover:bg-green-50 rounded-xl font-bold text-xs transition-all shadow-sm"
                >
                  💡 คำแนะนำและเคล็ดลับสำหรับผู้เรียน ปวช.
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW 6: ADMIN OVERVIEW PANEL --- */}
          {activeSection === "admin-panel" && role === "admin" && (
            <div id="admin-panel" className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative overflow-hidden">
              {/* Shine Animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none transform -skew-x-12 translate-x-[-100%] animate-shine"></div>
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl">🧑‍🏫</div>
              
              <div className="pb-4 border-b border-slate-100 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                <div>
                  <span className="text-xs text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2.5 py-1 rounded-full font-mono">
                    ส่วนควบคุมของผู้นำการสอนและวิทยากร
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 mt-2">
                    🧑‍🏫 แผงประเมินผลและภาพรวมความคืบหน้าของนักเรียนทั้งหมด
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    วิเคราะห์ผลสัมฤทธิ์ทางการศึกษา สเปกฮาร์ดแวร์ และอัตราความสำเร็จของกลุ่มเรียน
                  </p>
                </div>

                {/* Filter and Clear Buttons */}
                <button
                  onClick={() => {
                    Swal.fire({
                      title: "รีเซ็ตทำเนียบคะแนน?",
                      text: "คุณต้องการล้างข้อมูลคะแนนเพื่อเริ่มรับกลุ่มเรียนกลุ่มใหม่ใช่หรือไม่? (ข้อมูลในชีตจะไม่สูญหาย)",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#dc2626",
                      confirmButtonText: "ล้างสถิติเริ่มต้นใหม่"
                    }).then((r) => {
                      if (r.isConfirmed) {
                        setLeaderboard(initialLeaderboard);
                        Swal.fire("ล้างเรียบร้อย", "ทำเนียบผู้เรียนรีเซ็ตเป็นค่าตั้งต้นเรียบร้อยแล้วค่ะ", "success");
                      }
                    });
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold"
                >
                  🧹 เคลียร์ตารางลีดเดอร์บอร์ดสถิติ
                </button>
              </div>

              {/* ADMIN STATISTICS DASHBOARD */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center shadow-xs">
                  <span className="text-[10px] text-green-600 uppercase font-bold block">จำนวนผู้ลงทะเบียน</span>
                  <span className="text-2xl font-black text-green-800 mt-1 block">{adminPanelData.totalStudents} คน</span>
                </div>
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 text-center shadow-xs">
                  <span className="text-[10px] text-teal-600 uppercase font-bold block">คะแนนเฉลี่ยก่อนเรียน</span>
                  <span className="text-2xl font-black text-teal-800 mt-1 block">{adminPanelData.averagePre} / 10</span>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center shadow-xs">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">คะแนนเฉลี่ยหลังเรียน</span>
                  <span className="text-2xl font-black text-blue-800 mt-1 block">{adminPanelData.averagePost} / 10</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center shadow-xs">
                  <span className="text-[10px] text-amber-600 uppercase font-bold block">อัตราเรียนสำเร็จ</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">{adminPanelData.completionRate}%</span>
                </div>
              </div>

              {/* LIVE STUDENT RECORDS LIST */}
              <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-4 relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <h4 className="text-sm font-bold text-slate-700">
                    📂 ตารางรายชื่อประวัติกิจกรรมนักเรียน ปวช. ทั้งหมดในฐานระบบ
                  </h4>
                  <div className="relative w-full md:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-4.5 h-4.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="กรอกชื่อเพื่อค้นหาเรียลไทม์..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl bg-white border border-slate-200/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">ลำดับ</th>
                        <th className="p-3">ชื่อ-นามสกุล</th>
                        <th className="p-3 text-center">คะแนนก่อนเรียน</th>
                        <th className="p-3 text-center">คะแนนหลังเรียน</th>
                        <th className="p-3 text-center">ผลการพัฒนา</th>
                        <th className="p-3 text-center">สถานะกิจกรรม</th>
                        <th className="p-3 text-center">เวลาเข้าเรียน</th>
                        <th className="p-3 text-center">เวลาออก</th>
                        <th className="p-3 text-center">เวลาเรียนสะสม</th>
                        <th className="p-3">วันที่ทำการบันทึกล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminLeaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-4 text-center text-slate-400">
                            ❌ ไม่พบข้อมูลสอดคล้องตามตัวค้นหาที่ระบุ
                          </td>
                        </tr>
                      ) : (
                        filteredAdminLeaderboard.map((st, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-bold text-slate-500">#{i + 1}</td>
                            <td className="p-3 font-semibold text-slate-700">{st.name}</td>
                            <td className="p-3 text-center font-mono font-bold text-slate-500">{st.preTestScore}/10</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-600">
                              {st.postTestScore >= 0 ? `${st.postTestScore}/10` : "ยังไม่ได้ทำ"}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.improvement.startsWith("+") ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              }`}>
                                {st.improvement}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                st.status === "เรียนจบ" ? "bg-green-600" : "bg-amber-500"
                              }`}>
                                {st.status}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-[10px] text-slate-500">
                              {st.loginTime || "-"}
                            </td>
                            <td className="p-3 text-center font-mono text-[10px] text-slate-500">
                              {st.logoutTime || "ยังไม่ออก"}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-[10px] text-indigo-600">
                              {formatDuration(st.totalStudyTime)}
                            </td>
                            <td className="p-3 text-slate-400 font-mono">{st.timestamp}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DB SCHEMA INFORMATION FOR DEPLOYMENT AUDITING */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-500" /> ข้อมูลโครงสร้างตารางและตัวแปรบันทึกชีตอัจฉริยะ (Sheet Schema ID):
                </h5>
                <p className="text-[10px] text-slate-500 leading-normal">
                  <b>ชีตฐานข้อมูลหลัก:</b> 18I4yFbzkqGQNkdnKF_pU7kRadEsEq0E5ucaRQ86K2Ko<br/>
                  <b>แอปสคริปต์สตรีมเซิร์ฟเวอร์:</b> https://script.google.com/macros/s/AKfycbxZiekWOj-x9c_u9Z1UE-JtHYiPIJ1-KNw2tELeeyq_U_Yxv8KTHBQ6_usH9ZsxQXvGXA/exec<br/>
                  <b>คอลัมน์ชีตที่สร้างอัตโนมัติ:</b> [ name, preTestScore, postTestScore, improvement, status, timestamp, loginTime, logoutTime, totalStudyTime ]
                </p>
              </div>

            </div>
          )}

        </div>

        {/* WORKSPACE FOOTER */}
        <footer className="w-full text-center py-4 text-slate-400 text-xs border-t border-slate-200/50 mt-12">
          <p>© 2026 Copyright | พัฒนาโดย Thitima Kerdmoung | 21910-2001 ระบบปฏิบัติการคอมพิวเตอร์</p>
        </footer>

      </main>

    </div>
  );
}
