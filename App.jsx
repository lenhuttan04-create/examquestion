import React, { useEffect, useState, useRef } from "react";

// CONFIG
// If you uploaded questions.json to the repository root, the app will fetch "/questions.json".
// Alternatively, set QUESTIONS_URL to a raw GitHub URL like "https://raw.githubusercontent.com/username/repo/main/questions.json"
const QUESTIONS_URL = null; // or set to raw URL string
const EXAM_SIZE = 40;
const EXAM_TIME_MINUTES = 30;
const ADMIN_PASS = "letmein123"; // client-side simple admin gate (not secure) - change if desired

export default function App() {
  const [bank, setBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState([]);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState("idle"); // idle | running | finished
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME_MINUTES * 60);
  const timerRef = useRef(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminText, setAdminText] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Try QUESTIONS_URL if provided
      if (QUESTIONS_URL) {
        try {
          const res = await fetch(QUESTIONS_URL);
          if (!res.ok) throw new Error("Cannot fetch questions from QUESTIONS_URL");
          const j = await res.json();
          setBank(j);
          setLoading(false);
          return;
        } catch (e) {
          console.warn("Failed to fetch QUESTIONS_URL", e);
          setError("Failed to fetch QUESTIONS_URL. Will try local file.");
        }
      }
      // Try local /questions.json
      try {
        const res = await fetch("/questions.json");
        if (res.ok) {
          const j = await res.json();
          setBank(j);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("No local questions.json", e);
      }
      // Try localStorage
      const saved = localStorage.getItem("question-bank");
      if (saved) {
        try {
          const j = JSON.parse(saved);
          setBank(j);
          setLoading(false);
          return;
        } catch (e) {
          console.warn("Local parse fail", e);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (mode === "running") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            finishExam();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [mode]);

  function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startExam() {
    if (bank.length < EXAM_SIZE) {
      alert(`Bộ câu hỏi chỉ có ${bank.length} câu — cần ít nhất ${EXAM_SIZE} câu.`);
      return;
    }
    const shuffled = shuffleArray(bank.slice()).slice(0, EXAM_SIZE);
    setExam(shuffled);
    setAnswers({});
    setMode("running");
    setTimeLeft(EXAM_TIME_MINUTES * 60);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishExam() {
    clearInterval(timerRef.current);
    setMode("finished");
  }

  function submitExam() {
    if (!confirm("Nộp bài và chấm điểm?")) return;
    finishExam();
  }

  function score() {
    if (exam.length === 0) return 0;
    let correct = 0;
    for (let i = 0; i < exam.length; i++) {
      const e = exam[i];
      const ans = answers[e.id];
      if (ans === undefined) continue;
      if (Number(ans) === Number(e.answer)) correct++;
    }
    return correct;
  }

  function handleChoose(qid, idx) {
    setAnswers((a) => ({ ...a, [qid]: idx }));
  }

  function enterAdmin() {
    const p = prompt("Nhập mật khẩu admin:");
    if (p === ADMIN_PASS) setAdminMode(true);
    else alert("Sai mật khẩu");
  }

  function saveBankToLocal() {
    localStorage.setItem("question-bank", JSON.stringify(bank));
    alert("Đã lưu bộ câu hỏi vào trình duyệt (localStorage).");
  }

  function importAdminText() {
    try {
      const j = JSON.parse(adminText);
      if (!Array.isArray(j)) throw new Error("JSON phải là mảng");
      const bad = j.find((q) => !q.q || !Array.isArray(q.choices) || typeof q.answer !== "number");
      if (bad) return alert("Một vài phần tử không hợp lệ. Mỗi câu cần {q, choices:[], answer:number}");
      setBank(j);
      setAdminText("");
      alert('Import thành công. Nhớ bấm "Lưu vào trình duyệt" hoặc upload file to GitHub theo hướng dẫn.');
    } catch (e) {
      alert("JSON không hợp lệ: " + e.message);
    }
  }

  function formatTime(s) {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return (
    <div style={{ maxWidth: 980, margin: "18px auto", fontFamily: "Arial,Helvetica,sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Trang thi (40 câu / 30 phút)</h1>
        <div>
          <button onClick={() => { if (adminMode) setAdminMode(false); else enterAdmin(); }}>
            {adminMode ? "Thoát admin" : "Admin"}
          </button>
        </div>
      </header>

      <section style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Trạng thái bộ câu hỏi</h3>
        <div>{loading ? "Đang tải..." : bank.length ? `${bank.length} câu trong bộ` : "Chưa có bộ câu hỏi."}</div>
        {error && <div style={{ color: "red" }}>{error}</div>}

        <div style={{ marginTop: 8 }}>
          <button onClick={startExam} disabled={mode === "running" || bank.length < EXAM_SIZE}>Bắt đầu đề ngẫu nhiên</button>
          <button onClick={() => { localStorage.removeItem("question-bank"); setBank([]); alert("Đã xóa bộ câu hỏi local"); }} style={{ marginLeft: 8 }}>Xóa local</button>
        </div>

        <div style={{ marginTop: 8, color: "#555" }}>
          Ghi chú: Nếu bạn upload questions.json lên repo và dùng QUESTIONS_URL, app sẽ tải tự động. Hoặc dùng Admin để paste JSON (local).
        </div>
      </section>

      {adminMode && (
        <section style={{ marginTop: 12, padding: 12, border: "1px dashed #999", borderRadius: 8 }}>
          <h3>Admin — Paste JSON bộ câu hỏi</h3>
          <div style={{ marginBottom: 6 }}>
            Dán JSON (mảng) ở đây rồi nhấn Import. Sau đó nhấn "Lưu vào trình duyệt" để lưu local. Để cho nhiều người dùng truy cập, upload file JSON lên GitHub public repo và chỉnh QUESTIONS_URL.
          </div>
          <textarea value={adminText} onChange={(e) => setAdminText(e.target.value)} rows={8} style={{ width: "100%" }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={importAdminText}>Import</button>
            <button onClick={saveBankToLocal} style={{ marginLeft: 8 }}>Lưu vào trình duyệt</button>
          </div>
        </section>
      )}

      {mode === "running" && (
        <section style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>Thời gian còn lại: <strong>{formatTime(timeLeft)}</strong></div>
            <div>Đã làm: {Object.keys(answers).length}/{exam.length}</div>
          </div>

          <ol style={{ marginTop: 12 }}>
            {exam.map((q, idx) => (
              <li key={q.id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600 }}>{idx + 1}. {q.q}</div>
                <div style={{ marginTop: 6 }}>
                  {q.choices && q.choices.length ? q.choices.map((c, i) => (
                    <label key={i} style={{ display: "block", marginTop: 6, cursor: "pointer" }}>
                      <input type="radio" name={q.id} checked={String(answers[q.id]) === String(i)} onChange={() => handleChoose(q.id, i)} /> {c}
                    </label>
                  )) : <div style={{ color: "#888" }}>Không có lựa chọn.</div>}
                </div>
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 10 }}>
            <button onClick={submitExam}>Nộp bài</button>
          </div>
        </section>
      )}

      {mode === "finished" && (
        <section style={{ marginTop: 12, padding: 12, border: "2px solid #4CAF50", borderRadius: 8, background: "#f7fff7" }}>
          <h2>Kết quả</h2>
          <div style={{ fontSize: 18 }}>Điểm: <strong>{score()}</strong> / {exam.length}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => { setMode("idle"); setExam([]); setAnswers({}); setTimeLeft(EXAM_TIME_MINUTES * 60); }}>Quay lại</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Chi tiết</h4>
            <ol>
              {exam.map((q, idx) => (
                <li key={q.id} style={{ marginBottom: 8 }}>
                  <div><strong>{idx + 1}.</strong> {q.q}</div>
                  <div>Đáp án của bạn: {answers[q.id] !== undefined ? q.choices[answers[q.id]] : "<Chưa trả lời>"}</div>
                  <div>Đáp án đúng: {q.choices[q.answer]}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <footer style={{ marginTop: 20, fontSize: 13, color: "#666" }}>
        <div>Gợi ý triển khai:</div>
        <ul>
          <li>Upload file <code>questions.json</code> (mình đã tạo) vào repository public.</li>
          <li>Deploy lên Vercel (kết nối GitHub) — Vercel sẽ build và cấp link để chia sẻ.</li>
        </ul>
      </footer>
    </div>
  );
}
