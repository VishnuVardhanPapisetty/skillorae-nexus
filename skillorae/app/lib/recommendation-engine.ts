import type { StudentProfile, CareerProfile, SkillGap } from "./career-engine";

export type RecommendationPriority = "High" | "Medium" | "Low";

export type RecommendationCategory =
  | "Priority Focus"
  | "What to Learn"
  | "What to Build"
  | "Career Preparation"
  | "Next Best Action";

export type Recommendation = {
  category: RecommendationCategory;
  title: string;
  description: string;
  priority: RecommendationPriority;
  action: string;
};

export type RecommendationInput = {
  student: StudentProfile;
  career: CareerProfile;
  skillGaps: SkillGap[];
  readiness: number;
  futureReadiness: number;
  scenario: string;
};

function getTopGaps(skillGaps: SkillGap[], count = 3): SkillGap[] {
  return [...skillGaps].sort((a, b) => b.gap - a.gap).slice(0, count);
}

function getCareerLearningAdvice(careerName: string) {
  const advice: Record<
    string,
    {
      title: string;
      description: string;
      action: string;
    }
  > = {
    "AI / ML Engineer": {
      title: "Strengthen Python and Machine Learning",
      description:
        "Build strong foundations in Python, data handling, machine learning, model evaluation and practical AI development.",
      action:
        "Build one end-to-end ML project and document the dataset, approach, results and limitations.",
    },

    "Software Engineer": {
      title: "Strengthen DSA and Software Engineering",
      description:
        "Focus on problem solving, data structures, algorithms, APIs, debugging and writing maintainable software.",
      action:
        "Solve coding problems consistently while building one complete production-style application.",
    },

    "Data Scientist": {
      title: "Build Data Science Fundamentals",
      description:
        "Develop Python, statistics, data analysis, visualization and machine learning skills.",
      action:
        "Create a project covering data cleaning, exploratory analysis and predictive modeling.",
    },

    "Cybersecurity Engineer": {
      title: "Build Cybersecurity Foundations",
      description:
        "Develop foundations in networking, operating systems, security concepts and defensive security practices.",
      action:
        "Complete a beginner security lab and document the concepts and defensive techniques you learned.",
    },

    "Data Analyst": {
      title: "Improve Data Analysis Skills",
      description:
        "Focus on SQL, data cleaning, analysis, visualization and communicating useful insights.",
      action:
        "Build a dashboard using a real-world dataset and explain the key insights you discovered.",
    },

    "Full-Stack Developer": {
      title: "Build Full-Stack Development Skills",
      description:
        "Practice frontend development, backend APIs, databases, authentication and complete application architecture.",
      action:
        "Build and deploy one end-to-end web application with a frontend, backend and database.",
    },

    "Cloud / DevOps Engineer": {
      title: "Learn Cloud and DevOps Fundamentals",
      description:
        "Develop foundations in Linux, cloud concepts, deployment workflows, containers and automation.",
      action:
        "Deploy a small application and document the deployment process from development to production.",
    },
  };

  return (
    advice[careerName] ?? {
      title: "Strengthen Your Core Technical Skills",
      description:
        "Build stronger technical fundamentals and apply them through practical projects.",
      action:
        "Choose one important technical skill and complete a practical project around it.",
    }
  );
}

function getProjectAdvice(careerName: string) {
  const projects: Record<string, string> = {
    "AI / ML Engineer":
      "Build a student-performance prediction, recommendation or classification system.",

    "Software Engineer":
      "Build a complete application with authentication, APIs, database integration and deployment.",

    "Data Scientist":
      "Build a predictive analytics project using a real-world dataset.",

    "Cybersecurity Engineer":
      "Build a security-focused project such as a vulnerability analysis or defensive monitoring tool.",

    "Data Analyst":
      "Build an interactive analytics dashboard using a meaningful real-world dataset.",

    "Full-Stack Developer":
      "Build and deploy a full-stack application solving a real student or community problem.",

    "Cloud / DevOps Engineer":
      "Deploy an application using a cloud workflow and document the infrastructure and deployment process.",
  };

  return (
    projects[careerName] ??
    "Build a practical project that solves a real-world problem."
  );
}

export function getRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const { student, career, skillGaps, readiness, futureReadiness, scenario } =
    input;

  const recommendations: Recommendation[] = [];

  const topGaps = getTopGaps(skillGaps, 3);

  const topGap = topGaps[0];
  const secondGap = topGaps[1];

  /*
   * 1. PRIMARY SKILL GAP
   */

  if (topGap) {
    recommendations.push({
      category: "Priority Focus",
      title: `Improve ${topGap.skill}`,

      description:
        topGap.gap >= 60
          ? `${topGap.skill} is currently a major readiness gap for ${career.name}. Improving this skill should be one of your highest priorities.`
          : topGap.gap >= 30
            ? `${topGap.skill} is an important development area for your ${career.name} goal. Strengthening it can noticeably improve your readiness.`
            : `${topGap.skill} is one of the remaining areas that can help you move closer to your target career.`,

      priority: topGap.gap >= 60 ? "High" : topGap.gap >= 30 ? "Medium" : "Low",

      action: `Spend your next learning cycle focusing on ${topGap.skill} and complete at least one practical exercise or project.`,
    });
  }

  /*
   * 2. SECONDARY SKILL GAP
   */

  if (secondGap && secondGap.gap >= 25) {
    recommendations.push({
      category: "Priority Focus",
      title: `Develop ${secondGap.skill}`,

      description: `${secondGap.skill} is another important gap identified for your ${career.name} pathway.`,

      priority: secondGap.gap >= 50 ? "High" : "Medium",

      action: `After addressing your primary gap, dedicate focused practice to ${secondGap.skill}.`,
    });
  }

  /*
   * 3. CAREER-SPECIFIC LEARNING
   */

  const learningAdvice = getCareerLearningAdvice(career.name);

  recommendations.push({
    category: "What to Learn",

    title: learningAdvice.title,

    description: `${learningAdvice.description} This recommendation is aligned with your selected career: ${career.name}.`,

    priority: readiness < 60 ? "High" : "Medium",

    action: learningAdvice.action,
  });

  /*
   * 4. PERSONALIZED PROJECT
   */

  recommendations.push({
    category: "What to Build",

    title: `Build a ${career.name} portfolio project`,

    description: `Your current readiness is ${readiness}%. A practical project can convert your learning into demonstrable evidence for internships, placements and interviews.`,

    priority: readiness < 60 ? "High" : "Medium",

    action: getProjectAdvice(career.name),
  });

  /*
   * 5. ACADEMIC RECOMMENDATION
   */

  const cgpa = Number(student.cgpa);

  if (Number.isFinite(cgpa)) {
    if (cgpa < 7) {
      recommendations.push({
        category: "Career Preparation",

        title: "Strengthen your academic performance",

        description: `Your current CGPA is ${cgpa}. Improving your academic performance can strengthen your overall student profile while you develop technical skills.`,

        priority: "High",

        action:
          "Prioritize clearing pending academic gaps and maintain consistent semester performance.",
      });
    } else if (cgpa < 8) {
      recommendations.push({
        category: "Career Preparation",

        title: "Push your CGPA higher",

        description: `Your current CGPA is ${cgpa}. Maintaining stronger academic performance alongside technical projects can make your profile more balanced.`,

        priority: "Medium",

        action:
          "Set a semester academic target while continuing your technical skill development.",
      });
    } else {
      recommendations.push({
        category: "Career Preparation",

        title: "Maintain your academic strength",

        description: `Your CGPA is ${cgpa}, giving you a solid academic foundation. Your next priority should be converting that foundation into technical evidence.`,

        priority: "Low",

        action:
          "Maintain your academic performance while investing more time in projects, coding and career preparation.",
      });
    }
  }

  /*
   * 6. SCENARIO-BASED INTELLIGENCE
   */

  const scenarioLower = scenario.toLowerCase();

  if (scenarioLower.includes("accelerated")) {
    recommendations.push({
      category: "Next Best Action",

      title: "Execute your accelerated growth plan",

      description:
        "Your selected simulation assumes strong learning consistency, practical projects and focused skill development.",

      priority: "High",

      action:
        "Create a weekly schedule covering learning, coding practice, projects and career preparation.",
    });
  } else if (scenarioLower.includes("consistent")) {
    recommendations.push({
      category: "Next Best Action",

      title: "Maintain consistent progress",

      description:
        "Your simulation assumes regular learning and project development. Consistency is the key factor that can turn your current readiness into long-term growth.",

      priority: "Medium",

      action:
        "Set weekly learning targets and review your progress at the end of every week.",
    });
  } else {
    recommendations.push({
      category: "Next Best Action",

      title: "Increase your learning consistency",

      description:
        "Your conservative scenario represents gradual growth. Increasing your learning consistency can improve the speed of your progress.",

      priority: "Medium",

      action:
        "Start with a realistic weekly learning schedule and gradually increase your project and practice time.",
    });
  }

  /*
   * 7. FUTURE GROWTH
   */

  const growth = futureReadiness - readiness;

  if (growth >= 15) {
    recommendations.push({
      category: "Next Best Action",

      title: "Convert your potential into real progress",

      description: `Your simulation shows ${growth}% potential improvement from your current readiness. The biggest challenge now is consistent execution.`,

      priority: "High",

      action:
        "Follow your roadmap consistently and reassess your skills after completing major learning milestones.",
    });
  } else if (growth > 0) {
    recommendations.push({
      category: "Next Best Action",

      title: "Keep building momentum",

      description: `Your current simulation shows ${growth}% potential improvement. Small consistent improvements can compound over time.`,

      priority: "Medium",

      action:
        "Continue developing your highest-gap skills and complete practical projects.",
    });
  }

  return recommendations;
}
