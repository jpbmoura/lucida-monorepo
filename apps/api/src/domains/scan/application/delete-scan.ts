import type { ScanRepository } from "../domain/scan-repository.js";
import { ScanId } from "../domain/scan-id.js";
import { ScanNotFoundError } from "../domain/scan-errors.js";

interface Input {
  scanId: string;
  ownerId: string;
}

/**
 * Remove o ScanResult. Não apaga a Submission derivada — é só o histórico
 * de digitalização que some. Pra invalidar uma nota vinda do scanner,
 * o professor exclui a submissão na listagem de submissões (feature futura).
 */
export class DeleteScanUseCase {
  constructor(private readonly scans: ScanRepository) {}

  async execute(input: Input): Promise<void> {
    const scan = await this.scans.findById(ScanId.of(input.scanId));
    if (!scan || !scan.isOwnedBy(input.ownerId)) {
      throw new ScanNotFoundError();
    }
    await this.scans.delete(scan.id);
  }
}
