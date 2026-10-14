import type { LearningPhase, LearningTopic } from "./learning-progress";

type RoadmapTemplate = {
  phase: string;
  duration: string;
  objective: string;
  tasks: string[];
};

export type CareerRoadmapPhase = LearningPhase & {
  duration: string;
  objective: string;
};

const roadmapTemplates: Record<string, RoadmapTemplate[]> = {
  "AI / ML Engineer": [
    {
      phase: "Foundation",
      duration: "2–3 Weeks",
      objective: "Build strong programming and data foundations.",
      tasks: [
        "Strengthen Python programming",
        "Practice problem solving",
        "Learn NumPy and Pandas",
        "Work with datasets",
      ],
    },
    {
      phase: "Machine Learning",
      duration: "3–4 Weeks",
      objective: "Understand core machine learning concepts.",
      tasks: [
        "Learn supervised and unsupervised learning",
        "Study regression and classification",
        "Practice model evaluation",
        "Build small ML projects",
      ],
    },
    {
      phase: "Deep Learning",
      duration: "4–5 Weeks",
      objective: "Move toward modern AI development.",
      tasks: [
        "Learn neural networks",
        "Understand training and validation",
        "Explore CNN fundamentals",
        "Experiment with AI datasets",
      ],
    },
    {
      phase: "Portfolio & Career",
      duration: "3–4 Weeks",
      objective: "Turn your AI skills into real projects.",
      tasks: [
        "Build an end-to-end AI project",
        "Deploy the project",
        "Document your architecture",
        "Prepare your GitHub portfolio",
      ],
    },
  ],
  "Software Engineer": [
    {
      phase: "Programming Foundation",
      duration: "2–3 Weeks",
      objective: "Strengthen programming and problem solving.",
      tasks: [
        "Strengthen one programming language",
        "Practice functions and OOP",
        "Improve debugging",
        "Build small coding projects",
      ],
    },
    {
      phase: "DSA",
      duration: "4–5 Weeks",
      objective: "Develop strong technical problem-solving ability.",
      tasks: [
        "Learn arrays and strings",
        "Practice stacks and queues",
        "Study trees and sorting",
        "Solve coding problems",
      ],
    },
    {
      phase: "Application Development",
      duration: "4–5 Weeks",
      objective: "Build complete software applications.",
      tasks: [
        "Learn frontend or backend development",
        "Build REST APIs",
        "Work with databases",
        "Deploy an application",
      ],
    },
    {
      phase: "Engineering & Interviews",
      duration: "3–4 Weeks",
      objective: "Prepare for software engineering roles.",
      tasks: [
        "Learn Git",
        "Understand software architecture",
        "Practice interviews",
        "Improve GitHub portfolio",
      ],
    },
  ],
  "Data Scientist": [
    {
      phase: "Data Foundation",
      duration: "2–3 Weeks",
      objective: "Build Python and data handling foundations.",
      tasks: [
        "Strengthen Python",
        "Learn NumPy and Pandas",
        "Practice data cleaning",
        "Work with datasets",
      ],
    },
    {
      phase: "Statistics & Analysis",
      duration: "3–4 Weeks",
      objective: "Develop statistical and analytical skills.",
      tasks: [
        "Learn descriptive statistics",
        "Understand probability",
        "Perform exploratory analysis",
        "Create visualizations",
      ],
    },
    {
      phase: "Machine Learning",
      duration: "4–5 Weeks",
      objective: "Apply machine learning to real datasets.",
      tasks: [
        "Learn regression",
        "Learn classification",
        "Study feature engineering",
        "Build predictive models",
      ],
    },
    {
      phase: "Portfolio & Career",
      duration: "3–4 Weeks",
      objective: "Create a strong data science portfolio.",
      tasks: [
        "Build an end-to-end project",
        "Document your analysis",
        "Publish on GitHub",
        "Prepare interviews",
      ],
    },
  ],
  "Cybersecurity Engineer": [
    {
      phase: "Security Foundation",
      duration: "2–3 Weeks",
      objective: "Understand cybersecurity fundamentals.",
      tasks: [
        "Learn networking",
        "Understand operating systems",
        "Study security concepts",
        "Learn authentication",
      ],
    },
    {
      phase: "Defensive Security",
      duration: "3–4 Weeks",
      objective: "Develop defensive security knowledge.",
      tasks: [
        "Learn common attack categories",
        "Study security monitoring",
        "Understand logs",
        "Practice defensive concepts",
      ],
    },
    {
      phase: "Security Labs",
      duration: "4–5 Weeks",
      objective: "Gain practical security experience.",
      tasks: [
        "Use beginner security labs",
        "Practice network analysis",
        "Explore vulnerability assessment",
        "Document your learning",
      ],
    },
    {
      phase: "Security Portfolio",
      duration: "3–4 Weeks",
      objective: "Build evidence of cybersecurity skills.",
      tasks: [
        "Build a defensive security project",
        "Document the architecture",
        "Create a GitHub portfolio",
        "Prepare interviews",
      ],
    },
  ],
  "Data Analyst": [
    {
      phase: "Data Foundations",
      duration: "2–3 Weeks",
      objective: "Build strong data handling skills.",
      tasks: [
        "Learn spreadsheet fundamentals",
        "Strengthen Python",
        "Learn Pandas",
        "Practice data cleaning",
      ],
    },
    {
      phase: "SQL & Analysis",
      duration: "3–4 Weeks",
      objective: "Become comfortable analyzing data.",
      tasks: [
        "Learn SQL",
        "Practice filtering and aggregation",
        "Learn joins",
        "Analyze real datasets",
      ],
    },
    {
      phase: "Visualization",
      duration: "3–4 Weeks",
      objective: "Turn data into useful insights.",
      tasks: [
        "Learn visualization principles",
        "Create dashboards",
        "Practice data storytelling",
        "Identify business insights",
      ],
    },
    {
      phase: "Portfolio & Career",
      duration: "3–4 Weeks",
      objective: "Build a professional analytics portfolio.",
      tasks: [
        "Create an interactive dashboard",
        "Complete an analytics project",
        "Document findings",
        "Prepare interviews",
      ],
    },
  ],
  "Full-Stack Developer": [
    {
      phase: "Frontend Foundation",
      duration: "3–4 Weeks",
      objective: "Build modern frontend skills.",
      tasks: [
        "Strengthen HTML, CSS and JavaScript",
        "Learn React",
        "Build reusable components",
        "Practice responsive UI",
      ],
    },
    {
      phase: "Backend Development",
      duration: "3–4 Weeks",
      objective: "Learn application backend development.",
      tasks: [
        "Learn server-side development",
        "Build REST APIs",
        "Understand authentication",
        "Connect databases",
      ],
    },
    {
      phase: "Full-Stack Projects",
      duration: "4–5 Weeks",
      objective: "Combine frontend and backend skills.",
      tasks: [
        "Build a complete application",
        "Implement authentication",
        "Add database integration",
        "Deploy the application",
      ],
    },
    {
      phase: "Engineering & Portfolio",
      duration: "3–4 Weeks",
      objective: "Prepare for professional development roles.",
      tasks: [
        "Improve Git workflow",
        "Learn application architecture",
        "Build another project",
        "Prepare interviews",
      ],
    },
  ],
  "Cloud / DevOps Engineer": [
    {
      phase: "Linux & Networking",
      duration: "2–3 Weeks",
      objective: "Build infrastructure fundamentals.",
      tasks: [
        "Learn Linux",
        "Understand processes and permissions",
        "Study networking",
        "Practice command line",
      ],
    },
    {
      phase: "Cloud Fundamentals",
      duration: "3–4 Weeks",
      objective: "Understand modern cloud infrastructure.",
      tasks: [
        "Learn cloud concepts",
        "Understand compute and storage",
        "Learn cloud networking",
        "Deploy a basic application",
      ],
    },
    {
      phase: "DevOps & Automation",
      duration: "4–5 Weeks",
      objective: "Learn deployment and automation workflows.",
      tasks: [
        "Learn Git and CI/CD",
        "Understand containers",
        "Explore Docker",
        "Automate deployment",
      ],
    },
    {
      phase: "Cloud Portfolio & Career",
      duration: "3–4 Weeks",
      objective: "Demonstrate practical cloud skills.",
      tasks: [
        "Deploy a complete application",
        "Create a CI/CD workflow",
        "Document infrastructure",
        "Prepare interviews",
      ],
    },
  ],
};

function careerSlug(careerName: string): string {
  return careerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildTopic(id: string, title: string): LearningTopic {
  const focus = title.charAt(0).toLowerCase() + title.slice(1);

  return {
    id,
    title,
    subtopics: [
      { id: `${id}-step-1`, title: `Review the core concepts in ${focus}` },
      { id: `${id}-step-2`, title: `Practice ${focus} with a guided example` },
      {
        id: `${id}-step-3`,
        title: `Apply ${focus} in a small independent challenge`,
      },
    ],
  };
}

export function getCareerRoadmap(careerName: string): CareerRoadmapPhase[] {
  const selectedCareer = roadmapTemplates[careerName]
    ? careerName
    : "Software Engineer";
  const careerId = careerSlug(selectedCareer);

  return roadmapTemplates[selectedCareer].map((phase, phaseIndex) => {
    const phaseId = `${careerId}-phase-${phaseIndex + 1}`;

    return {
      id: phaseId,
      title: phase.phase,
      duration: phase.duration,
      objective: phase.objective,
      topics: phase.tasks.map((task, topicIndex) =>
        buildTopic(`${phaseId}-topic-${topicIndex + 1}`, task),
      ),
    };
  });
}

export type SampleQuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function getSampleQuiz(topicTitle: string): SampleQuizQuestion[] {
  return [
    {
      prompt: `When beginning a task in ${topicTitle}, what is the most useful first check?`,
      options: [
        "Clarify the goal, inputs, and constraints",
        "Repeat a familiar process without checking the goal",
        "Skip planning and submit the first result",
      ],
      correctIndex: 0,
      explanation:
        "A clear goal and known constraints make practice focused and results easier to evaluate.",
    },
    {
      prompt: `How can you best check your understanding of ${topicTitle} while practicing?`,
      options: [
        "Reread notes without trying an example",
        "Try a small example and compare its result with an expectation",
        "Avoid checking the result until the end",
      ],
      correctIndex: 1,
      explanation:
        "Small examples reveal misunderstandings early and make it easier to locate an error.",
    },
    {
      prompt: `Which is the strongest practice signal for ${topicTitle}?`,
      options: [
        "Copying a worked example exactly",
        "Recognizing the topic name in your notes",
        "Applying the idea independently to a new, related task",
      ],
      correctIndex: 2,
      explanation:
        "Applying an idea to a new task is stronger evidence than recognition, but a short sample quiz still cannot establish real-world mastery.",
    },
  ];
}
