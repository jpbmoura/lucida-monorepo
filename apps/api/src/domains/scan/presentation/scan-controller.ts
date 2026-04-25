import type { RequestHandler } from "express";
import type { ScanSheetUseCase } from "../application/scan-sheet.js";
import type { ListScansByExamUseCase } from "../application/list-scans-by-exam.js";
import type { ApproveScanUseCase } from "../application/approve-scan.js";
import type { DeleteScanUseCase } from "../application/delete-scan.js";
import {
  examIdParam,
  scanIdParam,
  scanSheetBody,
} from "./scan-schemas.js";

interface Deps {
  scanSheet: ScanSheetUseCase;
  listScansByExam: ListScansByExamUseCase;
  approveScan: ApproveScanUseCase;
  deleteScan: DeleteScanUseCase;
}

export class ScanController {
  constructor(private readonly deps: Deps) {}

  scan: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const body = scanSheetBody.parse(req.body);
      const data = await this.deps.scanSheet.execute({
        examId: id,
        ownerId: req.auth!.userId,
        imageBase64: stripDataUrlPrefix(body.imageBase64),
      });
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  listByExam: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const data = await this.deps.listScansByExam.execute({
        examId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  approve: RequestHandler = async (req, res, next) => {
    try {
      const { id } = scanIdParam.parse(req.params);
      await this.deps.approveScan.execute({
        scanId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = scanIdParam.parse(req.params);
      await this.deps.deleteScan.execute({
        scanId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

function stripDataUrlPrefix(value: string): string {
  // "data:image/jpeg;base64,XXX" → "XXX"
  const comma = value.indexOf(",");
  if (value.startsWith("data:") && comma > 0) {
    return value.slice(comma + 1);
  }
  return value;
}
