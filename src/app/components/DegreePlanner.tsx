import { FormEvent, useEffect, useMemo, useState } from "react";
import { GraduationCap, Plus, Trash2, BookOpen, BarChart3 } from "lucide-react";

type PlannedCourse = {
  id: string;
  code: string;
  title: string;
  credits: number;
};

type SemesterPlan = {
  id: string;
  name: string;
  courses: PlannedCourse[];
};

const STORAGE_KEY = "nova-degree-planner-v1";
const TARGET_CREDITS = 120;

const defaultSemesters: SemesterPlan[] = [
  { id: "fall-y1", name: "Fall Year 1", courses: [] },
  { id: "spring-y1", name: "Spring Year 1", courses: [] },
  { id: "fall-y2", name: "Fall Year 2", courses: [] },
  { id: "spring-y2", name: "Spring Year 2", courses: [] },
];

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DegreePlanner() {
  const [semesters, setSemesters] = useState<SemesterPlan[]>(defaultSemesters);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState(defaultSemesters[0].id);
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCredits, setCourseCredits] = useState("3");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as SemesterPlan[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setSemesters(parsed);
      setSelectedSemesterId(parsed[0].id);
    } catch {
      setSemesters(defaultSemesters);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(semesters));
  }, [semesters]);

  const totalCredits = useMemo(
    () => semesters.reduce((sum, semester) => sum + semester.courses.reduce((inner, course) => inner + course.credits, 0), 0),
    [semesters],
  );

  const progress = Math.min((totalCredits / TARGET_CREDITS) * 100, 100);

  const handleAddSemester = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = newSemesterName.trim();
    if (!trimmedName) return;

    const newSemester: SemesterPlan = { id: createId(), name: trimmedName, courses: [] };
    setSemesters((prev) => [...prev, newSemester]);
    setSelectedSemesterId(newSemester.id);
    setNewSemesterName("");
  };

  const handleAddCourse = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const code = courseCode.trim();
    const title = courseTitle.trim();
    const credits = Number(courseCredits);

    if (!selectedSemesterId || !code || !title || !Number.isFinite(credits) || credits <= 0) {
      setError("Please fill all course fields with valid values.");
      return;
    }

    const newCourse: PlannedCourse = {
      id: createId(),
      code: code.toUpperCase(),
      title,
      credits,
    };

    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === selectedSemesterId
          ? { ...semester, courses: [...semester.courses, newCourse] }
          : semester,
      ),
    );

    setCourseCode("");
    setCourseTitle("");
    setCourseCredits("3");
  };

  const handleRemoveCourse = (semesterId: string, courseId: string) => {
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === semesterId
          ? { ...semester, courses: semester.courses.filter((course) => course.id !== courseId) }
          : semester,
      ),
    );
  };

  const handleResetPlanner = () => {
    setSemesters(defaultSemesters);
    setSelectedSemesterId(defaultSemesters[0].id);
    setError("");
  };

  return (
    <div className="h-full w-full max-w-[1200px] mx-auto px-6 py-10 md:px-12 flex flex-col gap-8 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-cyan-400" />
          Degree Planner
        </h1>
        <p className="text-slate-400 font-light">
          Plan courses by semester, track credits, and keep your graduation path organized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0f1c]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-cyan-400/80 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Progress
            </h2>
            <div className="text-3xl font-bold text-white mb-2">{totalCredits} credits</div>
            <p className="text-xs text-slate-400 mb-4">Target: {TARGET_CREDITS} credits</p>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">{progress.toFixed(1)}% complete</p>
          </div>

          <form onSubmit={handleAddSemester} className="bg-[#0a0f1c]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-cyan-400/80 mb-4">Add Semester</h2>
            <input
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              placeholder="e.g., Fall Year 3"
              className="w-full bg-[#050b14]/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
            <button
              type="submit"
              className="mt-3 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Semester
            </button>
          </form>

          <button
            onClick={handleResetPlanner}
            className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium transition-colors"
          >
            Reset Planner
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleAddCourse} className="bg-[#0a0f1c]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-cyan-400/80 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Add Course
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="bg-[#050b14]/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id} className="bg-[#0b1220]">
                    {semester.name}
                  </option>
                ))}
              </select>
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Course Code"
                className="bg-[#050b14]/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
              />
              <input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Course Title"
                className="bg-[#050b14]/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
              />
              <input
                type="number"
                min={1}
                max={6}
                step={1}
                value={courseCredits}
                onChange={(e) => setCourseCredits(e.target.value)}
                placeholder="Credits"
                className="bg-[#050b14]/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
              />
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <button
              type="submit"
              className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-colors"
            >
              Add Course to Semester
            </button>
          </form>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {semesters.map((semester) => {
              const semesterCredits = semester.courses.reduce((sum, course) => sum + course.credits, 0);
              return (
                <div key={semester.id} className="bg-[#0a0f1c]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">{semester.name}</h3>
                    <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full">
                      {semesterCredits} credits
                    </span>
                  </div>

                  {semester.courses.length === 0 ? (
                    <p className="text-sm text-slate-500">No courses added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {semester.courses.map((course) => (
                        <div key={course.id} className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-white">{course.code}</p>
                            <p className="text-xs text-slate-400">{course.title}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-300">{course.credits} cr</span>
                            <button
                              onClick={() => handleRemoveCourse(semester.id, course.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                              aria-label={`Remove ${course.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}