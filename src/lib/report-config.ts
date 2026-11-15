import type { ProgressReportConfig } from "./progress-report";

/**
 * Static branding + signatory details used on the downloadable progress
 * report PDF. Edit the values here — no code changes needed.
 *
 * Logo files are served from /public: drop `srm-logo.png` (left) and
 * `college-emblem.png` (right) into the `public/` folder. If a file is
 * missing the PDF falls back to a placeholder box.
 */
export const progressReportConfig: ProgressReportConfig = {
  collegeName: "SRM VALLIAMMAI ENGINEERING COLLEGE",
  collegeSubline: "(An Autonomous Institution)",
  collegeAddress: "SRM NAGAR, KATTANKULATHUR - 603 203.",
  logoPath: "/srm-logo.png",
  // Left empty for now — drop a file at public/college-emblem.png and set
  // this to "/college-emblem.png" to show it on the right of the header.
  emblemPath: "",
  degree: "B.TECH",
  assessmentTitle: "CONTINUOUS ASSESSMENT TEST - I",
  assessmentShort: "CAT-I",
  passThresholdPercent: 50,
  classAdvisor: "Ms. Abarana",
  classCoAdvisor: "Ms. A. Jeno Kalaiselvi Saliya",
  yearCoordinator: "Mr. B. Yogesh Kumar",
  hod: "Dr. B. Muthusenthil",
};
