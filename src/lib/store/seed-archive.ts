export interface SeedNetworkUser {
  id: string;
  userId: string;
  username: string;
  handle: string;
  name: string;
  initials: string;
  avatar: string | null;
  online: boolean;
  bio: string;
  interests: string[];
  school: string;
  year: string;
  goals: string;
}

export const SEED_NETWORK_USERS: SeedNetworkUser[] = [
  {
    id: "aanya_id",
    userId: "aanya_id",
    username: "AanyaMehta",
    handle: "aanya_mehta",
    name: "Aanya Mehta",
    initials: "AM",
    avatar: null,
    online: true,
    bio: "Computer Science Sophomore | Love talking algorithms & sliding window patterns.",
    interests: ["DSA", "LeetCode", "Java"],
    school: "LMN Tech",
    year: "Sophomore",
    goals: "Crack summer internship, finish Striver SDE sheet."
  },
  {
    id: "kabir_id",
    userId: "kabir_id",
    username: "KabirSingh",
    handle: "kabir_singh",
    name: "Kabir Singh",
    initials: "KS",
    avatar: null,
    online: true,
    bio: "Full Stack Builder. Pushing React, Node.js, and scaling systems.",
    interests: ["Web Dev", "React", "NodeJS"],
    school: "LMN Tech",
    year: "Junior",
    goals: "Scale side project to 100 users, master System Design."
  },
  {
    id: "riya_id",
    userId: "riya_id",
    username: "RiyaSharma",
    handle: "riya_sharma",
    name: "Riya Sharma",
    initials: "RS",
    avatar: null,
    online: false,
    bio: "AI/ML Enthusiast. Coding Transformers & NLP notebooks in PyTorch.",
    interests: ["AI/ML", "PyTorch", "Python"],
    school: "ABC College",
    year: "Senior",
    goals: "Submit research paper, finish fast.ai course."
  },
  {
    id: "arjun_id",
    userId: "arjun_id",
    username: "ArjunVerma",
    handle: "arjun_verma",
    name: "Arjun Verma",
    initials: "AV",
    avatar: null,
    online: true,
    bio: "Database nerd & OS designer. Let's study concurrency controls.",
    interests: ["DBMS", "C++", "OS"],
    school: "XYZ Univ",
    year: "Freshman",
    goals: "Maintain 9.5 GPA, build a toy database engine."
  },
  {
    id: "meera_id",
    userId: "meera_id",
    username: "MeeraIyer",
    handle: "meera_iyer",
    name: "Meera Iyer",
    initials: "MI",
    avatar: null,
    online: false,
    bio: "Systems engineering & network protocol analyzer. Coffee enthusiast.",
    interests: ["OS", "Networks", "Go"],
    school: "XYZ Univ",
    year: "Senior",
    goals: "Prepare for final semester exams, learn Rust."
  }
];
