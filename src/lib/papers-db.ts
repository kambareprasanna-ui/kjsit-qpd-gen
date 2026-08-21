import { supabase } from "@/integrations/supabase/client";

export type PaperRecord = {
  id: string;
  status: "draft" | "sent_to_dqc" | "approved" | "not_approved";
  meta: any;
  sets: any[];
  created_by_role: string;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  dqc_feedback?: string | null;
  selected_set_index?: number | null;
};

export type DiagramRecord = {
  id: string;
  paper_id: string;
  set_index: number;
  question_key: string;
  image_url: string;
  caption?: string | null;
  created_at: string;
};

const PAPERS_STORAGE_KEY = "kjsit_portal_papers_store_v2";
const DIAGRAMS_STORAGE_KEY = "kjsit_portal_diagrams_store_v2";

function getInitialSeedPapers(): PaperRecord[] {
  return [
    {
      id: "paper-priya-os-1",
      status: "draft",
      meta: {
        examName: "Internal Assessment - I",
        date: "2026-08-25",
        courseName: "Operating Systems",
        courseCode: "ITC303",
        className: "SY",
        academicYear: "2025-26",
        semester: "III",
        marks: 20,
        testNumber: 1,
        designerName: "Prof. Priya Thombare",
        designerEmail: "priya.t@somaiya.edu",
        department: "Information Technology",
        courseOutcomes: {
          CO1: "Understand the fundamental concepts of operating system architecture, process management and scheduling algorithms.",
          CO2: "Analyze synchronization primitives and deadlock handling strategies.",
          CO3: "Evaluate memory management architectures including virtual memory and paging.",
        },
      },
      sets: [
        {
          setName: "Set A (Easy)",
          questions: [
            {
              key: "Q1a)",
              text: "Define Operating System and list four primary services provided by an OS.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "State the difference between monolithic kernel and microkernel architectures.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "What is a Process Control Block (PCB)? List its essential contents.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain the five-state process transition model with a neat labeled diagram.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Describe preemptive versus non-preemptive CPU scheduling criteria with examples.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Explain the four necessary conditions that must hold simultaneously for a deadlock to occur.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Given 4 processes with burst times P1: 6ms, P2: 8ms, P3: 7ms, P4: 3ms arriving at time 0, calculate average waiting time using FCFS and SJF.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Demonstrate Banker's Algorithm safety check for a system with 3 resource types.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
          ],
        },
        {
          setName: "Set B (Medium)",
          questions: [
            {
              key: "Q1a)",
              text: "What are system calls? Explain the role of dual-mode operation (User and Kernel mode).",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "Define context switching and explain why context switch time is pure overhead.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "List the advantages of multithreading over multiprocessing.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain the Producer-Consumer problem using Semaphores for process synchronization.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Discuss the Readers-Writers synchronization problem and its solution.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Compare Round Robin scheduling with Priority scheduling algorithms.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Apply Round Robin scheduling with Time Quantum = 2ms for processes P1(5ms), P2(4ms), P3(2ms) and calculate Turnaround Time.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Calculate the effective memory access time given TLB access time of 20ns and main memory access time of 100ns with 80% hit ratio.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
          ],
        },
        {
          setName: "Set C (Hard)",
          questions: [
            {
              key: "Q1a)",
              text: "Identify the trade-offs between user-level threads and kernel-level threads.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "What is Peterson's solution for the critical section problem? State its conditions.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "State the distinction between logical address space and physical address space.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain how segmentation differs from paging in memory management architectures.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Elaborate on page fault handling procedure in demand paging systems.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Explain thrashing and describe the working set strategy to prevent it.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Apply FIFO, LRU, and Optimal page replacement algorithms on reference string: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3 for 3 frames and compare page fault counts.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Formulate a Resource Allocation Graph reduction technique to detect deadlocks in multi-instance resource systems.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
          ],
        },
      ],
      created_by_role: "designer",
      created_by_email: "priya.t@somaiya.edu",
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:00:00.000Z",
      dqc_feedback: null,
      selected_set_index: 0,
    },
    {
      id: "paper-priya-dsa-2",
      status: "sent_to_dqc",
      meta: {
        examName: "Internal Assessment - II",
        date: "2026-08-28",
        courseName: "Data Structures & Algorithms",
        courseCode: "ITC302",
        className: "SY",
        academicYear: "2025-26",
        semester: "III",
        marks: 20,
        testNumber: 2,
        designerName: "Prof. Priya Thombare",
        designerEmail: "priya.t@somaiya.edu",
        department: "Information Technology",
        courseOutcomes: {
          CO4: "Analyze non-linear data structures including trees and graphs for searching and traversal operations.",
          CO5: "Implement advanced graph algorithms including shortest path and minimum spanning trees.",
          CO6: "Evaluate sorting and hashing techniques for optimal storage retrieval.",
        },
      },
      sets: [
        {
          setName: "Set A (Easy)",
          questions: [
            {
              key: "Q1a)",
              text: "Define AVL tree and explain the balance factor property.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "List the differences between BFS and DFS graph traversals.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "What is collision in hashing? List two open addressing techniques.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain Dijkstra's shortest path algorithm with step-by-step logic.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Describe Kruskal's algorithm to compute Minimum Spanning Tree.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Explain Min-Heap and Max-Heap construction procedures.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Construct an AVL Tree by inserting keys: 10, 20, 30, 40, 50, 25 and show rotations.",
              marks: 4,
              co: "CO6",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Trace QuickSort algorithm on array: [35, 12, 48, 9, 21, 64] using first element as pivot.",
              marks: 4,
              co: "CO6",
              bloom: "Apply",
            },
          ],
        },
      ],
      created_by_role: "designer",
      created_by_email: "priya.t@somaiya.edu",
      created_at: "2026-08-19T14:30:00.000Z",
      updated_at: "2026-08-19T15:00:00.000Z",
      dqc_feedback: null,
      selected_set_index: 0,
    },
    {
      id: "paper-vaishnavi-dbms-1",
      status: "sent_to_dqc",
      meta: {
        examName: "Internal Assessment - I",
        date: "2026-08-26",
        courseName: "Database Management Systems",
        courseCode: "CSC501",
        className: "TY",
        targetDqcYear: "TY",
        academicYear: "2025-26",
        semester: "V",
        marks: 20,
        testNumber: 1,
        designerName: "Prof. Vaishnavi Shinde",
        designerEmail: "vaishnavi.s@somaiya.edu",
        department: "Computer Engineering",
        courseOutcomes: {
          CO1: "Formulate relational schemas and Entity-Relationship models for enterprise databases.",
          CO2: "Construct complex relational algebra and SQL queries for data manipulation.",
          CO3: "Apply normalization principles to eliminate redundancies in relational schemas.",
        },
      },
      sets: [
        {
          setName: "Set A (Easy)",
          questions: [
            {
              key: "Q1a)",
              text: "Define Entity, Attribute, and Relationship in ER modeling with suitable examples.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "State the difference between Primary Key, Candidate Key, and Foreign Key.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "List the properties of Relational Tables in relational database models.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain the Three-Schema Architecture and Data Independence in DBMS.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Describe fundamental relational algebra operations (Select, Project, Cartesian Product, Union, Set Difference).",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Explain First, Second, and Third Normal Forms with functional dependency examples.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Given schema Employee(emp_id, emp_name, dept_id, salary) and Department(dept_id, dept_name), write SQL queries for highest paid employee per department.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Normalize relation R(A, B, C, D, E) with FDs {A->B, BC->D, E->C} up to 3NF.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
          ],
        },
      ],
      created_by_role: "designer",
      created_by_email: "vaishnavi.s@somaiya.edu",
      created_at: "2026-08-18T11:00:00.000Z",
      updated_at: "2026-08-18T11:00:00.000Z",
      dqc_feedback: null,
      selected_set_index: 0,
    },
    {
      id: "paper-rohit-ai-1",
      status: "sent_to_dqc",
      meta: {
        examName: "Internal Assessment - II",
        date: "2026-08-29",
        courseName: "Cloud Computing & DevOps",
        courseCode: "ITC701",
        className: "LY",
        targetDqcYear: "LY",
        academicYear: "2025-26",
        semester: "VII",
        marks: 20,
        testNumber: 2,
        designerName: "Prof. Rohit Mane",
        designerEmail: "rohit.m@somaiya.edu",
        department: "Information Technology",
        courseOutcomes: {
          CO4: "Analyze cloud service architectures (IaaS, PaaS, SaaS) and deployment models.",
          CO5: "Formulate CI/CD pipelines using automated container orchestration tools.",
          CO6: "Evaluate microservices patterns and cloud security governance.",
        },
      },
      sets: [
        {
          setName: "Set A (Standard)",
          questions: [
            {
              key: "Q1a)",
              text: "Explain the architectural differences between public, private, and hybrid cloud models.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "What is Infrastructure as Code (IaC)? State two benefits of using Terraform.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "Define Docker containerization and compare it with traditional hypervisor virtualization.",
              marks: 4,
              co: "CO4",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Describe the Kubernetes architecture including Master node components (API server, etcd, scheduler) and Worker nodes.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Explain continuous integration and continuous deployment pipeline stages with an example.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Discuss blue-green deployment versus canary deployment release strategies.",
              marks: 4,
              co: "CO5",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Design a fault-tolerant microservice deployment on AWS utilizing Auto-Scaling Groups and Application Load Balancer.",
              marks: 4,
              co: "CO6",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Formulate security best practices for API gateway authentication and OAuth2 token management in cloud microservices.",
              marks: 4,
              co: "CO6",
              bloom: "Apply",
            },
          ],
        },
      ],
      created_by_role: "designer",
      created_by_email: "rohit.m@somaiya.edu",
      created_at: "2026-08-19T16:00:00.000Z",
      updated_at: "2026-08-19T16:30:00.000Z",
      dqc_feedback: null,
      selected_set_index: 0,
    },
    {
      id: "paper-vaishnavi-cn-2",
      status: "approved",
      meta: {
        examName: "Internal Assessment - I",
        date: "2026-08-24",
        courseName: "Computer Networks",
        courseCode: "ITC403",
        className: "SY",
        academicYear: "2025-26",
        semester: "IV",
        marks: 20,
        testNumber: 1,
        designerName: "Prof. Vaishnavi Shinde",
        designerEmail: "vaishnavi.s@somaiya.edu",
        department: "Computer Engineering",
        courseOutcomes: {
          CO1: "Understand OSI and TCP/IP layered architecture and transmission media.",
          CO2: "Analyze data link layer framing, error control, and flow control protocols.",
          CO3: "Evaluate IP addressing and subnetting techniques for network design.",
        },
      },
      sets: [
        {
          setName: "Set A (Easy)",
          questions: [
            {
              key: "Q1a)",
              text: "Explain the functions of all 7 layers of OSI reference model in brief.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1b)",
              text: "State the differences between TCP and UDP transport protocols.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q1c)",
              text: "What is CSMA/CD? Explain how collision detection works.",
              marks: 4,
              co: "CO1",
              bloom: "Remember",
            },
            {
              key: "Q2a)",
              text: "Explain Sliding Window Protocol with Go-Back-N mechanism.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2b)",
              text: "Describe Cyclic Redundancy Check (CRC) error detection method.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q2c)",
              text: "Explain Distance Vector Routing versus Link State Routing.",
              marks: 4,
              co: "CO2",
              bloom: "Understand",
            },
            {
              key: "Q3a)",
              text: "Perform subnetting for IP network 192.168.10.0/24 to create 4 equal subnets and find valid host ranges.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
            {
              key: "Q3b)",
              text: "Generate CRC codeword for data bit sequence 1101011011 using divisor polynomial x^4 + x + 1.",
              marks: 4,
              co: "CO3",
              bloom: "Apply",
            },
          ],
        },
      ],
      created_by_role: "designer",
      created_by_email: "vaishnavi.s@somaiya.edu",
      created_at: "2026-08-17T09:00:00.000Z",
      updated_at: "2026-08-19T16:00:00.000Z",
      dqc_feedback: "Well balanced question paper meeting Bloom criteria and syllabus guidelines.",
      selected_set_index: 0,
    },
  ];
}

function getLocalPapers(): PaperRecord[] {
  if (typeof window === "undefined") return getInitialSeedPapers();
  try {
    const raw = localStorage.getItem(PAPERS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedPapers();
      localStorage.setItem(PAPERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const list: PaperRecord[] = JSON.parse(raw);
    return list;
  } catch {
    return getInitialSeedPapers();
  }
}

function saveLocalPapers(papers: PaperRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAPERS_STORAGE_KEY, JSON.stringify(papers));
    window.dispatchEvent(new CustomEvent("kjsit_papers_updated"));
  } catch (err) {
    console.error("Failed to save papers locally", err);
  }
}

function getLocalDiagrams(): DiagramRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDiagrams(diagrams: DiagramRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(diagrams));
  } catch (err) {
    console.error("Failed to save diagrams locally", err);
  }
}

export async function createPaper(paper: {
  status: "draft" | "sent_to_dqc" | "approved" | "not_approved";
  meta: any;
  sets: any[];
  created_by_role: string;
  created_by_email: string | null;
}): Promise<PaperRecord> {
  const newId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `paper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newRecord: PaperRecord = {
    id: newId,
    status: paper.status,
    meta: paper.meta,
    sets: paper.sets,
    created_by_role: paper.created_by_role,
    created_by_email: paper.created_by_email,
    created_at: now,
    updated_at: now,
    dqc_feedback: null,
    selected_set_index: 0,
  };

  // 1. Try Supabase first
  try {
    const { data, error } = await supabase
      .from("papers")
      .insert({
        id: newId,
        status: paper.status,
        meta: paper.meta,
        sets: paper.sets,
        created_by_role: paper.created_by_role,
        created_by_email: paper.created_by_email,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      // Save locally as cache too
      const local = getLocalPapers().filter((p) => p.id !== data.id);
      local.unshift(data as PaperRecord);
      saveLocalPapers(local);
      return data as PaperRecord;
    }
  } catch (err) {
    console.warn("Supabase insert paper failed, using local storage fallback", err);
  }

  // Fallback to local storage
  const local = getLocalPapers().filter((p) => p.id !== newId);
  local.unshift(newRecord);
  saveLocalPapers(local);
  return newRecord;
}

export async function fetchPapers(filter?: {
  status?: string;
  email?: string;
}): Promise<PaperRecord[]> {
  try {
    let query = supabase.from("papers").select("*").order("created_at", { ascending: false });
    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (filter?.email) {
      query = query.eq("created_by_email", filter.email);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // Sync to local
      const local = getLocalPapers();
      const map = new Map<string, PaperRecord>();
      local.forEach((p) => map.set(p.id, p));
      (data as PaperRecord[]).forEach((p) => map.set(p.id, p));
      saveLocalPapers(Array.from(map.values()));

      let list = data as PaperRecord[];
      if (filter?.email) {
        list = list.filter(
          (p) => p.created_by_email?.toLowerCase() === filter.email?.toLowerCase(),
        );
      }
      return list;
    }
  } catch (err) {
    console.warn("Supabase fetchPapers failed, reading local storage", err);
  }

  let local = getLocalPapers();
  if (filter?.status) {
    local = local.filter((p) => p.status === filter.status);
  }
  if (filter?.email) {
    local = local.filter((p) => p.created_by_email?.toLowerCase() === filter.email.toLowerCase());
  }
  return local;
}

export async function fetchPaperById(id: string): Promise<PaperRecord | null> {
  try {
    const { data, error } = await supabase.from("papers").select("*").eq("id", id).maybeSingle();
    if (!error && data) {
      return data as PaperRecord;
    }
  } catch (err) {
    console.warn("Supabase fetchPaperById failed, reading local storage", err);
  }

  const local = getLocalPapers();
  return local.find((p) => p.id === id) || null;
}

export async function updatePaperRecord(
  id: string,
  updates: Partial<PaperRecord>,
): Promise<PaperRecord | null> {
  const now = new Date().toISOString();
  const updatedFields = { ...updates, updated_at: now };

  try {
    const { data, error } = await supabase
      .from("papers")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!error && data) {
      const local = getLocalPapers().map((p) => (p.id === id ? (data as PaperRecord) : p));
      saveLocalPapers(local);
      return data as PaperRecord;
    }
  } catch (err) {
    console.warn("Supabase updatePaperRecord failed, updating local storage", err);
  }

  const local = getLocalPapers();
  const idx = local.findIndex((p) => p.id === id);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...updatedFields };
    saveLocalPapers(local);
    return local[idx];
  }
  return null;
}

export async function fetchDiagrams(paperId: string): Promise<DiagramRecord[]> {
  try {
    const { data, error } = await supabase.from("diagrams").select("*").eq("paper_id", paperId);
    if (!error && data) {
      return data as DiagramRecord[];
    }
  } catch (err) {
    console.warn("Supabase fetchDiagrams failed, reading local storage", err);
  }

  return getLocalDiagrams().filter((d) => d.paper_id === paperId);
}

export async function saveDiagramRecord(diagram: {
  paper_id: string;
  set_index: number;
  question_key: string;
  image_url: string;
  caption?: string;
}): Promise<DiagramRecord> {
  const newId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const record: DiagramRecord = {
    id: newId,
    paper_id: diagram.paper_id,
    set_index: diagram.set_index,
    question_key: diagram.question_key,
    image_url: diagram.image_url,
    caption: diagram.caption || null,
    created_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("diagrams")
      .insert({
        id: newId,
        paper_id: diagram.paper_id,
        set_index: diagram.set_index,
        question_key: diagram.question_key,
        image_url: diagram.image_url,
        caption: diagram.caption || null,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      const local = getLocalDiagrams().filter((d) => d.id !== data.id);
      local.push(data as DiagramRecord);
      saveLocalDiagrams(local);
      return data as DiagramRecord;
    }
  } catch (err) {
    console.warn("Supabase saveDiagramRecord failed, saving locally", err);
  }

  const local = getLocalDiagrams().filter(
    (d) =>
      !(
        d.paper_id === diagram.paper_id &&
        d.set_index === diagram.set_index &&
        d.question_key === diagram.question_key
      ),
  );
  local.push(record);
  saveLocalDiagrams(local);
  return record;
}
