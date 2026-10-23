// Owner-supplied public biography for issue #54. Keep professional claims here.
// Dates may overlap. Training does not imply verified current certification status.
type Experience = {
  employer: string
  role: string
  dates: string
  summary: string
}
type Topic = { title: string; description: string }
type Profile = {
  name: string
  credentials: string
  location: string
  headline: string
  summary: string
  homeHeadline: string
  homeSummary: string
  introduction: string[]
  sections: (Topic & { id: string })[]
  interests: Topic[]
  experience: Experience[]
  education: { school: string; degree: string; year: string }[]
  graduateEducation: string
  training: string
  expertise: Topic[]
  links: { linkedin: string; writing: string; work: string; source: string }
  seo: { title: string; description: string }
}

export const profile: Profile = {
  name: 'David Becker',
  credentials: 'RN, BSN, CCRN',
  location: 'Tulsa metropolitan area, Oklahoma',
  headline: 'Critical care nurse. Curious builder. Always learning.',
  summary:
    'A critical care nurse exploring software engineering, AI, and healthcare technology.',
  homeHeadline:
    'I know the bedside. I’m learning the tools to build beyond it.',
  homeSummary:
    'I’m David Becker, a critical care registered nurse in the Tulsa area. Alongside graduate nursing education, I’m learning software engineering and AI, bringing a clinical perspective to the tools I build and the questions I explore.',
  introduction: [
    'I’m David Becker, a critical care nurse based in the Tulsa area with more than a decade of experience caring for complex patients in intensive care and emergency settings.',
    'Outside the hospital, I’m learning software engineering and exploring artificial intelligence: how they work, where they help, and what it takes to build something people can rely on.',
  ],
  sections: [
    {
      id: 'clinical-background',
      title: 'Built in critical care.',
      description:
        'Working across intensive care specialties has shaped how I approach complexity. I care for patients who need advanced respiratory, renal, and circulatory support, alongside teams with different specialties and perspectives. That work depends on clinical judgment, clear communication, and reliable processes. It has taught me to look closely at how the parts of a system affect one another.',
    },
    {
      id: 'engineering',
      title: 'From critical care to code.',
      description:
        'I’m curious about the systems behind the screens I use, and I want to learn how to build useful software myself. I’m practicing modern web development with React, TypeScript, and JavaScript, developing my Python skills, and exploring AI-assisted development and automation. Nursing gives me practical questions to investigate; engineering gives me a new set of tools to investigate them with.',
    },
    {
      id: 'simpyll',
      title: 'Why I built Simpyll.',
      description:
        'Simpyll is my personal website and a working project. It gives me a place to practice interface design, publish technical notes, and document what I learn while building for the web. I share experiments and lessons here as they take shape, including questions at the intersection of healthcare and technology.',
    },
  ],
  interests: [
    {
      title: 'Web engineering',
      description:
        'Building this site with React and TypeScript while learning about accessible interfaces, static publishing, and maintainable code.',
    },
    {
      title: 'AI and automation',
      description:
        'Exploring Python, AI-assisted development, and ways to automate repetitive work. Linux, Bash, and Git/GitHub are part of that learning toolkit.',
    },
    {
      title: 'Healthcare technology',
      description:
        'Bringing experience with electronic health records and clinical workflows to questions about informatics, data analysis, and information architecture.',
    },
    {
      title: 'Writing to learn',
      description:
        'Turning technical study and experiments into notes I can revisit and share. Writing helps me find the gaps in my understanding.',
    },
  ],
  experience: [
    {
      employer: 'Saint Francis Health System',
      role: 'Registered Nurse — System-Wide Float Pool',
      dates: 'April 2021–Present',
      summary:
        'Assignments across medical, surgical, neuro, trauma, and cardiac intensive care, emergency, progressive care, telemetry, and medical-surgical settings.',
    },
    {
      employer: 'Saint Francis Health System',
      role: 'Registered Nurse — Neuro Trauma Surgical ICU',
      dates: 'May 2018–April 2021',
      summary:
        'Critical care nursing in a 30-bed neuro, trauma, and surgical intensive care unit.',
    },
    {
      employer: 'Saint Francis Health System',
      role: 'Registered Nurse — ICU / Clinical Float',
      dates: 'July 2017–April 2021',
      summary:
        'Assignments spanning intensive and emergency care, progressive care, interventional radiology, post-anesthesia care, endoscopy, and medical-surgical units.',
    },
    {
      employer: 'St. John Health System',
      role: 'Registered Nurse — Critical Care',
      dates: 'July 2014–June 2017',
      summary:
        'High-acuity patient care in a 24-bed medical ICU, with rapid response and code blue responsibilities.',
    },
  ],
  education: [
    {
      school: 'Graceland University',
      degree: 'Bachelor of Science in Nursing',
      year: '2025',
    },
    {
      school: 'Tulsa Community College',
      degree: 'Associate Degree in Nursing',
      year: '2014',
    },
  ],
  graduateEducation:
    'I’m continuing graduate nursing education through Graceland University while expanding into software and AI engineering.',
  training:
    'My clinical training includes ACLS, PALS, BLS, NIHSS, TNCC, ENPC, SLED, and FEMA emergency preparedness. CCRN was initially issued in August 2017. This is a background summary, not a record of current renewal or expiration status.',
  expertise: [
    {
      title: 'Critical care',
      description:
        'Intensive and emergency nursing, mechanical ventilation, neurological and trauma care.',
    },
    {
      title: 'Advanced support',
      description:
        'Experience caring for patients supported by VV/VA ECMO, CRRT, and mechanical circulatory support.',
    },
    {
      title: 'Clinical response',
      description:
        'Rapid response, code blue, high-acuity infusion management, and multidisciplinary coordination.',
    },
  ],
  links: {
    linkedin: 'https://www.linkedin.com/in/david-becker-rn-ccrn/',
    writing: '/blog',
    work: '/#work',
    source: 'https://github.com/simpyll/simpyll',
  },
  seo: {
    title: 'About David Becker — Critical Care Nurse & Curious Builder',
    description:
      'Meet David Becker, a critical care nurse exploring software engineering, AI, and healthcare technology. Learn about the person and ideas behind Simpyll.',
  },
}
