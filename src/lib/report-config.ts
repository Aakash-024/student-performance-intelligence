import type { ProgressReportConfig } from "./progress-report";

/**
 * Static branding + signatory details used on the downloadable ACADNEX
 * progress-report PDF. Edit the values here — no code changes needed.
 *
 * The ACADNEX letterhead (logo mark, wordmark, tagline) is drawn as vectors by
 * the layout engine. Set `institutionName` / `institutionSubline` to the
 * college's own name to issue the same report under the institution's
 * letterhead; the ACADNEX mark stays in the corner either way.
 */
export const progressReportConfig: ProgressReportConfig = {
  institutionName: "ACADNEX",
  institutionSubline: "Academic Performance Intelligence Platform",
  institutionTagline: "Academic Intelligence. Elevated.",
  degree: "B.TECH",
  departmentName: "Artificial Intelligence and Data Science",
  departmentCode: "AI & DS",
  reportTitle: "STUDENT PROGRESS REPORT",
  passThresholdPercent: 50,
  // Signatory names are left blank — they change per student/section and are
  // filled in by hand. Set any of these to a name to have it printed instead.
  classAdvisor: "",
  classCoAdvisor: "",
  yearCoordinator: "",
  hod: "",
};
