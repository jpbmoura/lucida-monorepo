// DTOs da feature de Integrações — compartilhados entre server (data.ts) e client.

export interface ClassroomStatusDTO {
  connected: boolean;
  googleEmail: string | null;
}

export interface ClassroomCourseDTO {
  classroomCourseId: string;
  name: string;
  section: string | null;
  /** Já importada como turma da Lucida? */
  imported: boolean;
  lucidaClassId: string | null;
}

export interface ReconciliationReportDTO {
  imported: number;
  alreadyExisted: number;
  departed: number;
  skippedNoEmail: number;
}

export interface ImportResultDTO {
  classId: string;
  courseId: string;
  alreadyLinked: boolean;
  report: ReconciliationReportDTO;
}
