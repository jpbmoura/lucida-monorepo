import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import { ClassroomNotConnectedError } from "../domain/classroom-errors.js";
import type { ClassroomApiClient } from "./ports/classroom-api-client.js";
import type { EnsureFreshCredentialService } from "./ensure-fresh-credential.js";

interface Input {
  teacherId: string;
}

export interface ClassroomCourseListItem {
  classroomCourseId: string;
  name: string;
  section: string | null;
  /** Já importada como turma da Lucida? */
  imported: boolean;
  /** Id da turma Lucida vinculada, quando importada. */
  lucidaClassId: string | null;
}

/**
 * Lista as turmas ACTIVE do professor no Classroom e marca quais já foram
 * importadas (cruza pelo `class.classroomCourseId`). É a base do painel
 * persistente — não é wizard: a lista some/aparece conforme a conexão.
 */
export class ListClassroomCoursesUseCase {
  constructor(
    private readonly credentials: ClassroomCredentialRepository,
    private readonly ensureFresh: EnsureFreshCredentialService,
    private readonly api: ClassroomApiClient,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<ClassroomCourseListItem[]> {
    const credential = await this.credentials.findByTeacherId(input.teacherId);
    if (!credential) throw new ClassroomNotConnectedError();

    const fresh = await this.ensureFresh.execute(credential);
    const courses = await this.api.listActiveCourses(fresh.accessToken);

    return Promise.all(
      courses.map(async (course) => {
        const linked = await this.classes.findByOwnerAndClassroomCourseId(
          input.teacherId,
          course.id,
        );
        return {
          classroomCourseId: course.id,
          name: course.name,
          section: course.section,
          imported: linked !== null,
          lucidaClassId: linked ? linked.id.toString() : null,
        };
      }),
    );
  }
}
