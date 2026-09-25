// server/data/interviewQuestions.js

const interviewQuestions = [
  {
    role: "Frontend Developer",
    difficulty: "Mid Level",
    questionCount: 4,
    questions: [
      "What is the difference between state and props in React, and how does unidirectional data flow work?",
      "Can you explain the Virtual DOM and how React uses reconciliation (diffing) to update the UI efficiently?",
      "How do you manage global state in a large React application? When would you use Context API vs Redux or Zustand?",
      "How would you optimize the performance of a React app that suffers from unnecessary re-renders?",
      "What is the Critical Rendering Path, and how does the browser convert HTML, CSS, and JS into pixels on the screen?",
      "Explain the difference between useEffect, useLayoutEffect, and useMemo. When would you use each?",
      "How does CSS specificity work, and how do you approach CSS architecture in large-scale modern frontend applications?",
      "What are Progressive Web Apps (PWAs), and what role do Service Workers play in offline caching?",
      "How do you handle accessibility (a11y) in React applications to ensure compliance with WCAG standards?",
      "Explain event bubbling and event capturing in JavaScript, and how React synthetic events handle them."
    ]
  },
  {
    role: "Backend Developer",
    difficulty: "Mid Level",
    questionCount: 4,
    questions: [
      "Explain the differences between SQL and NoSQL databases. When would you choose PostgreSQL over MongoDB?",
      "How does JWT (JSON Web Token) authentication work, and how do you securely store and verify tokens in an Express backend?",
      "What is the Node.js Event Loop? What happens when a CPU-intensive synchronous task blocks the main thread?",
      "What is middleware in Express.js? Explain with an example of how you would implement authentication and logging middleware.",
      "How do you handle database indexing, and how does an index speed up reads while affecting write performance?",
      "What strategies do you use for connection pooling and managing heavy database traffic in Node.js?",
      "How would you implement rate limiting and brute-force protection for public authentication endpoints?",
      "Explain the differences between synchronous REST APIs, WebSockets, and message queues (like RabbitMQ or Kafka).",
      "How do you handle database transactions and ensure ACID compliance across multiple document or table updates?",
      "What are database race conditions, and how do you prevent them using optimistic or pessimistic locking?"
    ]
  },
  {
    role: "System Design Interview",
    difficulty: "Senior",
    questionCount: 4,
    questions: [
      "Design a high-scale URL shortening service like Bitly. Explain your data schema, Base62 encoding, and caching layer.",
      "How would you design a distributed rate-limiting system for a public API processing 100,000 requests per second?",
      "Describe how you would architect a real-time messaging application like WhatsApp or Slack. How do you handle delivery receipts and offline sync?",
      "How do you design a Content Delivery Network (CDN) to cache static and dynamic content globally with low latency?",
      "Design a distributed unique ID generator system like Twitter Snowflake. What constraints must it satisfy?",
      "How would you design a notification service supporting push notifications, SMS, and emails with deduplication and retry policies?",
      "Explain how you would design an e-commerce flash sale checkout system with strict inventory limits and high concurrency.",
      "How do you design a video streaming platform like YouTube or Netflix, including video encoding, adaptive bitrate, and storage tiers?"
    ]
  },
  {
    role: "Full Stack Developer",
    difficulty: "Mid Level",
    questionCount: 4,
    questions: [
      "Walk me through the lifecycle of an HTTP request from a button click in React to the database write and JSON response.",
      "How do you protect a web application against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)?",
      "What is the difference between client-side rendering (CSR), server-side rendering (SSR), and static site generation (SSG)?",
      "How do you design RESTful APIs adhering to Richardson Maturity Model, and when would you consider GraphQL?",
      "How would you implement file uploads (images/videos) in a full-stack app without overloading the web server memory?",
      "Explain how you implement end-to-end user authentication with refresh token rotation and HttpOnly cookies.",
      "How do you monitor and debug production errors across both the browser and the Node.js server?",
      "What strategies do you use for database schema migrations with zero downtime in continuous deployment?"
    ]
  },
  {
    role: "DevOps & Cloud Engineer",
    difficulty: "Mid Level",
    questionCount: 4,
    questions: [
      "Explain the difference between container virtualization with Docker and traditional virtual machines (VMs).",
      "What are the core components of a Kubernetes cluster, and how does a Pod differ from a Container?",
      "How do you design a CI/CD pipeline with automated testing, linting, Docker build, and zero-downtime deployment?",
      "What is Infrastructure as Code (IaC), and what advantages does Terraform provide over manual cloud console setup?",
      "How do you implement centralized logging and distributed tracing across microservices using Prometheus, Grafana, or ELK?",
      "Explain Blue-Green deployments vs Canary deployments. When would you choose one over the other?",
      "How do you secure cloud environments, secrets management, and IAM roles following the principle of least privilege?",
      "How do you design an auto-scaling policy for web applications based on CPU, memory, and custom request metrics?"
    ]
  },
  {
    role: "Behavioral & Leadership",
    difficulty: "All Levels",
    questionCount: 4,
    questions: [
      "Tell me about a time you faced a difficult technical bug under a tight deadline. How did you diagnose and solve it?",
      "Describe a situation where you had a strong disagreement with a teammate on architecture or design. How did you resolve it?",
      "Tell me about a project that failed or didn't go as planned. What were the root causes, and what did you learn?",
      "How do you prioritize competing tasks when multiple stakeholders require high-priority deliverables at the same time?",
      "Describe a situation where you took the initiative to improve a code pattern, documentation, or engineering process without being asked.",
      "Tell me about a time you had to explain a complex technical concept to a non-technical product manager or stakeholder.",
      "How do you handle constructive criticism or code review feedback that you initially disagree with?",
      "Describe how you stay current with new technologies and decide when to adopt a new library versus sticking to battle-tested tools."
    ]
  }
];

function getRandomQuestions(roleName, count = 4) {
  const roleItem =
    interviewQuestions.find(
      (item) => item.role.toLowerCase() === (roleName || "").toLowerCase()
    ) || interviewQuestions[0];

  const shuffled = [...roleItem.questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  interviewQuestions,
  getRandomQuestions
};
