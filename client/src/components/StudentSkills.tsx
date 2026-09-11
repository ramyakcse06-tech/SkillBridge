import { useEffect, useState } from "react";

interface Skill {
  id: number;
  student_id: number;
  skill_id: number;
  esco_skill_id: string;
  skill_name: string;
  skill_type: string | null;
  description: string | null;
  proficiency_level: string | null;
  source: string;
  confidence_score: number | null;
}

interface SkillsResponse {
  success: boolean;
  student_id: number;
  skill_count: number;
  skills: Skill[];
}

function StudentSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/students/1/skills")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch skills");
        }

        return response.json();
      })
      .then((data: SkillsResponse) => {
        if (!data.success) {
          throw new Error("Could not load student skills");
        }

        setSkills(data.skills);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <h2>My Skills</h2>
        <p>Loading skills...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>My Skills</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1>Student Skill Profile</h1>

      <p>
        Detected Skills: <strong>{skills.length}</strong>
      </p>

      {skills.length === 0 ? (
        <p>No skills detected yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          {skills.map((skill) => (
            <div
              key={skill.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "18px",
                background: "#fff",
              }}
            >
              <h3>{skill.skill_name}</h3>

              <p>
                <strong>Type:</strong>{" "}
                {skill.skill_type || "Not specified"}
              </p>

              <p>
                <strong>Source:</strong> {skill.source}
              </p>

              {skill.description && (
                <p style={{ fontSize: "14px" }}>
                  {skill.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentSkills;