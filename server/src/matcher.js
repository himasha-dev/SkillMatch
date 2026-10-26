const levels = { Certificate: 1, Diploma: 2, Bachelor: 3, Master: 4, PhD: 5 };
export function calculateMatch(student, internship) {
  const have = (student.skills || []).map((s) => s.toLowerCase().trim());
  const required = (internship.requiredSkills || []).map((s) =>
    s.toLowerCase().trim(),
  );
  const matched = required.filter((s) => have.includes(s));
  const missing = required.filter((s) => !have.includes(s));
  const breakdown = {
    skills: required.length ? (matched.length / required.length) * 60 : 60,
    field:
      internship.preferredField === "Any" ||
      (student.field || "").toLowerCase() === (internship.preferredField || "").toLowerCase()
        ? 15
        : 0,
    degree:
      (levels[student.degree] || 0) >= (levels[internship.minimumDegree] || 0)
        ? 10
        : 0,
    gpa: student.gpa >= internship.minimumGpa ? 10 : 0,
    location:
      internship.location === "Remote" ||
      (student.location || "").toLowerCase() === (internship.location || "").toLowerCase()
        ? 5
        : 0,
  };
  return {
    score: Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0)),
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v)]),
    ),
    matchedSkills: matched,
    missingSkills: missing,
  };
}
