import type { ScanResult } from "./scan-result.js";
import type { ScanId } from "./scan-id.js";

export interface ScanRepository {
  nextId(): ScanId;
  save(scan: ScanResult): Promise<void>;
  findById(id: ScanId): Promise<ScanResult | null>;
  findByExamId(examId: string): Promise<ScanResult[]>;
  delete(id: ScanId): Promise<void>;
}
