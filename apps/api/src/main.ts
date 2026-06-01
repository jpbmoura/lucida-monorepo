// Composition root.
//
// Instancia mongo → BetterAuth → repositories → use cases → controllers → routers → Express app.
// Aqui é o único lugar onde dependências são wired manualmente, sem DI container.

import type { Express } from "express";
import { env } from "@/env.js";
import { connectMongo } from "@/infrastructure/database/mongodb/connection.js";
import { createApp } from "@/app.js";

import { createAuth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import { getAuthDb } from "@/domains/iam/infrastructure/better-auth/mongo-client.js";
import { makeRequireAuth } from "@/domains/iam/presentation/middleware/require-auth.js";
import { MongoTeacherAssistantRepository } from "@/domains/iam/infrastructure/mongo-teacher-assistant-repository.js";
import { CreateAssistantUseCase } from "@/domains/iam/application/create-assistant.js";
import { ListAssistantsForTeacherUseCase } from "@/domains/iam/application/list-assistants-for-teacher.js";
import { ListTeachersForAssistantUseCase } from "@/domains/iam/application/list-teachers-for-assistant.js";
import { RevokeAssistantUseCase } from "@/domains/iam/application/revoke-assistant.js";
import { SelectAssistantTargetUseCase } from "@/domains/iam/application/select-assistant-target.js";
import { SelectAssistantSelfTargetUseCase } from "@/domains/iam/application/select-assistant-self-target.js";
import { AssistantController } from "@/domains/iam/presentation/assistant-controller.js";
import { makeOptionalAuth } from "@/domains/iam/presentation/middleware/optional-auth.js";
import { makeIamRouter } from "@/domains/iam/presentation/routes.js";

import { MongooseCourseRepository } from "@/domains/course/infrastructure/mongoose-course-repository.js";
import { CreateCourseUseCase } from "@/domains/course/application/create-course.js";
import { ListCoursesUseCase } from "@/domains/course/application/list-courses.js";
import { GetCourseUseCase } from "@/domains/course/application/get-course.js";
import { UpdateCourseUseCase } from "@/domains/course/application/update-course.js";
import { DeleteCourseUseCase } from "@/domains/course/application/delete-course.js";
import { CourseController } from "@/domains/course/presentation/course-controller.js";
import { makeCourseRouter } from "@/domains/course/presentation/course-routes.js";

import { MongooseClassRepository } from "@/domains/class/infrastructure/mongoose-class-repository.js";
import { CreateClassUseCase } from "@/domains/class/application/create-class.js";
import { ListClassesUseCase } from "@/domains/class/application/list-classes.js";
import { GetClassUseCase } from "@/domains/class/application/get-class.js";
import { UpdateClassUseCase } from "@/domains/class/application/update-class.js";
import { DeleteClassUseCase } from "@/domains/class/application/delete-class.js";
import { ClassController } from "@/domains/class/presentation/class-controller.js";
import { makeClassRouter } from "@/domains/class/presentation/class-routes.js";

import { MongooseStudentRepository } from "@/domains/student/infrastructure/mongoose-student-repository.js";
import { CreateStudentUseCase } from "@/domains/student/application/create-student.js";
import { ListStudentsByClassUseCase } from "@/domains/student/application/list-students-by-class.js";
import { UpdateStudentUseCase } from "@/domains/student/application/update-student.js";
import { DeleteStudentUseCase } from "@/domains/student/application/delete-student.js";
import { StudentController } from "@/domains/student/presentation/student-controller.js";
import { makeStudentRouter } from "@/domains/student/presentation/student-routes.js";

import type { ClassroomOAuthClient } from "@/domains/classroom/application/ports/classroom-oauth-client.js";
import type { ClassroomApiClient } from "@/domains/classroom/application/ports/classroom-api-client.js";
import type { TokenCipher } from "@/domains/classroom/application/ports/token-cipher.js";
import { AesGcmTokenCipher } from "@/domains/classroom/infrastructure/aes-gcm-token-cipher.js";
import { GoogleClassroomOAuthClient } from "@/domains/classroom/infrastructure/google-classroom-oauth-client.js";
import { GoogleClassroomApiClient } from "@/domains/classroom/infrastructure/google-classroom-api-client.js";
import { UnavailableClassroomOAuthClient } from "@/domains/classroom/infrastructure/unavailable-classroom-oauth-client.js";
import { UnavailableClassroomApiClient } from "@/domains/classroom/infrastructure/unavailable-classroom-api-client.js";
import { UnavailableTokenCipher } from "@/domains/classroom/infrastructure/unavailable-token-cipher.js";
import { MongooseClassroomCredentialRepository } from "@/domains/classroom/infrastructure/mongoose-classroom-credential-repository.js";
import { EnsureFreshCredentialService } from "@/domains/classroom/application/ensure-fresh-credential.js";
import { GetConnectionStatusUseCase } from "@/domains/classroom/application/get-connection-status.js";
import { BuildAuthorizeUrlUseCase } from "@/domains/classroom/application/build-authorize-url.js";
import { CompleteOAuthUseCase } from "@/domains/classroom/application/complete-oauth.js";
import { DisconnectClassroomUseCase } from "@/domains/classroom/application/disconnect-classroom.js";
import { ListClassroomCoursesUseCase } from "@/domains/classroom/application/list-classroom-courses.js";
import { ImportClassroomCourseUseCase } from "@/domains/classroom/application/import-classroom-course.js";
import { ReconcileStudentsUseCase } from "@/domains/classroom/application/reconcile-students.js";
import { ClassroomController } from "@/domains/classroom/presentation/classroom-controller.js";
import { makeClassroomRouter } from "@/domains/classroom/presentation/classroom-routes.js";
import { makeClassroomOAuthRouter } from "@/domains/classroom/presentation/classroom-oauth-routes.js";

import { MongooseExamRepository } from "@/domains/exam/infrastructure/mongoose-exam-repository.js";
import { DocxExamBuilderImpl } from "@/domains/exam/infrastructure/docx-exam-builder.js";
import { CreateExamUseCase } from "@/domains/exam/application/create-exam.js";
import { ListExamsByClassUseCase } from "@/domains/exam/application/list-exams-by-class.js";
import { GetExamUseCase } from "@/domains/exam/application/get-exam.js";
import { UpdateExamUseCase } from "@/domains/exam/application/update-exam.js";
import { DeleteExamUseCase } from "@/domains/exam/application/delete-exam.js";
import { ExportExamDocxUseCase } from "@/domains/exam/application/export-exam-docx.js";
import { CopyExamToClassUseCase } from "@/domains/exam/application/copy-exam-to-class.js";
import { ExamController } from "@/domains/exam/presentation/exam-controller.js";
import { makeExamRouter } from "@/domains/exam/presentation/exam-routes.js";

import { PdfExtractor } from "@/domains/ai-ops/infrastructure/extractors/pdf-extractor.js";
import { DocxExtractor } from "@/domains/ai-ops/infrastructure/extractors/docx-extractor.js";
import { TextExtractor } from "@/domains/ai-ops/infrastructure/extractors/text-extractor.js";
import { YoutubeTranscriptFetcher } from "@/domains/ai-ops/infrastructure/extractors/youtube-transcript-fetcher.js";
import { OpenAiQuestionGenerator } from "@/domains/ai-ops/infrastructure/openai/openai-question-generator.js";
import { OpenAiAnswerGrader } from "@/domains/ai-ops/infrastructure/openai/open-answer-grader.js";
import { OpenAiOpenQuestionGenerator } from "@/domains/ai-ops/infrastructure/openai/openai-open-question-generator.js";
import { EstimateGradingUseCase } from "@/domains/ai-ops/application/estimate-grading.js";
import { GradeOpenAnswersUseCase } from "@/domains/ai-ops/application/grade-open-answers.js";
import { GenerateOpenQuestionsUseCase } from "@/domains/ai-ops/application/generate-open-questions.js";
import { EstimateOpenGenerationUseCase } from "@/domains/ai-ops/application/estimate-open-generation.js";
import { RegenerateOpenQuestionUseCase } from "@/domains/ai-ops/application/regenerate-open-question.js";
import { AnswerExplanationVerifier } from "@/domains/ai-ops/infrastructure/openai/answer-explanation-verifier.js";
import { GenerateExamQuestionsUseCase } from "@/domains/ai-ops/application/generate-exam-questions.js";
import { RegenerateQuestionUseCase } from "@/domains/ai-ops/application/regenerate-question.js";
import { EstimateExamGenerationUseCase } from "@/domains/ai-ops/application/estimate-exam-generation.js";
import { OpenAiLessonPlanGenerator } from "@/domains/ai-ops/infrastructure/openai/openai-lesson-plan-generator.js";
import { GenerateLessonPlanUseCase } from "@/domains/ai-ops/application/generate-lesson-plan.js";
import { RegenerateLessonBlockUseCase } from "@/domains/ai-ops/application/regenerate-lesson-block.js";
import { EstimateLessonPlanUseCase } from "@/domains/ai-ops/application/estimate-lesson-plan.js";
import { AiController } from "@/domains/ai-ops/presentation/ai-controller.js";
import { LessonPlanAiController } from "@/domains/ai-ops/presentation/lesson-plan-ai-controller.js";
import { makeAiRouter } from "@/domains/ai-ops/presentation/ai-routes.js";
import { OpenAiSlideDeckGenerator } from "@/domains/ai-ops/infrastructure/openai/openai-slide-deck-generator.js";
import { PexelsImageProvider } from "@/domains/ai-ops/infrastructure/images/pexels-image-provider.js";
import { UnavailableImageProvider } from "@/domains/ai-ops/infrastructure/images/unavailable-image-provider.js";
import { GenerateDeckUseCase } from "@/domains/ai-ops/application/generate-deck.js";
import { RegenerateSlideUseCase } from "@/domains/ai-ops/application/regenerate-slide.js";
import { EstimateDeckCreditsUseCase } from "@/domains/ai-ops/application/estimate-deck-credits.js";
import { SlideDeckAiController } from "@/domains/ai-ops/presentation/slide-deck-ai-controller.js";

import { MongooseSlideDeckRepository } from "@/domains/slide-deck/infrastructure/mongoose-slide-deck-repository.js";
import { CreateSlideDeckUseCase } from "@/domains/slide-deck/application/create-slide-deck.js";
import { GetSlideDeckUseCase } from "@/domains/slide-deck/application/get-slide-deck.js";
import { ListSlideDecksUseCase } from "@/domains/slide-deck/application/list-slide-decks.js";
import { UpdateSlideDeckUseCase } from "@/domains/slide-deck/application/update-slide-deck.js";
import { ReorderSlidesUseCase } from "@/domains/slide-deck/application/reorder-slides.js";
import { DeleteSlideDeckUseCase } from "@/domains/slide-deck/application/delete-slide-deck.js";
import { SlideDeckController } from "@/domains/slide-deck/presentation/slide-deck-controller.js";
import { makeSlideDeckRouter } from "@/domains/slide-deck/presentation/slide-deck-routes.js";

import { MongooseLessonPlanRepository } from "@/domains/lesson-plan/infrastructure/mongoose-lesson-plan-repository.js";
import { DocxLessonPlanBuilderImpl } from "@/domains/lesson-plan/infrastructure/docx-lesson-plan-builder.js";
import { CreateLessonPlanUseCase } from "@/domains/lesson-plan/application/create-lesson-plan.js";
import { ListLessonPlansByClassUseCase } from "@/domains/lesson-plan/application/list-lesson-plans-by-class.js";
import { GetLessonPlanUseCase } from "@/domains/lesson-plan/application/get-lesson-plan.js";
import { UpdateLessonPlanUseCase } from "@/domains/lesson-plan/application/update-lesson-plan.js";
import { DeleteLessonPlanUseCase } from "@/domains/lesson-plan/application/delete-lesson-plan.js";
import { DuplicateLessonPlanUseCase } from "@/domains/lesson-plan/application/duplicate-lesson-plan.js";
import { ArchiveLessonPlanUseCase } from "@/domains/lesson-plan/application/archive-lesson-plan.js";
import { ExportLessonPlanDocxUseCase } from "@/domains/lesson-plan/application/export-lesson-plan-docx.js";
import { LessonPlanController } from "@/domains/lesson-plan/presentation/lesson-plan-controller.js";
import { makeLessonPlanRouter } from "@/domains/lesson-plan/presentation/lesson-plan-routes.js";

import { MongooseSubmissionRepository } from "@/domains/submission/infrastructure/mongoose-submission-repository.js";
import { GetPublicExamUseCase } from "@/domains/submission/application/get-public-exam.js";
import { GetPublicResultUseCase } from "@/domains/submission/application/get-public-result.js";
import { BeginExamUseCase } from "@/domains/submission/application/begin-exam.js";
import { BeginExamByEmailUseCase } from "@/domains/submission/application/begin-exam-by-email.js";
import { BeginExamFromTokenUseCase } from "@/domains/submission/application/begin-exam-from-token.js";
import { ResolveExamLinkTokenUseCase } from "@/domains/submission/application/resolve-exam-link-token.js";
import { SubmitExamUseCase } from "@/domains/submission/application/submit-exam.js";
import { ListSubmissionsByExamUseCase } from "@/domains/submission/application/list-submissions-by-exam.js";
import { GetSubmissionForGradingUseCase } from "@/domains/submission/application/get-submission-for-grading.js";
import { GradeOpenAnswersManuallyUseCase } from "@/domains/submission/application/grade-open-answers-manually.js";
import { ApproveOpenGradesUseCase } from "@/domains/submission/application/approve-open-grades.js";
import { CountPendingCorrectionsUseCase } from "@/domains/submission/application/count-pending-corrections.js";
import { ListGradingQueueUseCase } from "@/domains/submission/application/list-grading-queue.js";
import { SubmissionController } from "@/domains/submission/presentation/submission-controller.js";
import {
  makePublicSubmissionRouter,
  makeAuthedSubmissionRouter,
} from "@/domains/submission/presentation/submission-routes.js";

import { ComputeOverviewUseCase } from "@/domains/analytics/application/compute-overview.js";
import { ComputeClassOverviewUseCase } from "@/domains/analytics/application/compute-class-overview.js";
import { ComputeStudentOverviewUseCase } from "@/domains/analytics/application/compute-student-overview.js";
import { ComputeExamOverviewUseCase } from "@/domains/analytics/application/compute-exam-overview.js";
import { ComputeOrgOverviewUseCase } from "@/domains/analytics/application/compute-org-overview.js";
import { ListOrgMembersAndInvitationsUseCase } from "@/domains/analytics/application/list-org-members-and-invitations.js";
import { AcceptInviteWithSignupUseCase } from "@/domains/analytics/application/accept-invite-with-signup.js";
import { GetOrgBillingUseCase } from "@/domains/analytics/application/get-org-billing.js";
import { ComputeTeacherOverviewUseCase } from "@/domains/analytics/application/compute-teacher-overview.js";
import { ExportTeacherDataUseCase } from "@/domains/analytics/application/export-teacher-data.js";
import { BaOrganizationMembersRepository } from "@/domains/analytics/infrastructure/ba-organization-members-repository.js";
import { BaOrganizationInvitationsRepository } from "@/domains/analytics/infrastructure/ba-organization-invitations-repository.js";
import { BaInvitationAcceptor } from "@/domains/analytics/infrastructure/ba-invitation-acceptor.js";
import { AnalyticsController } from "@/domains/analytics/presentation/analytics-controller.js";
import { makeAnalyticsRouter } from "@/domains/analytics/presentation/analytics-routes.js";
import { makeRequireOrgAdmin } from "@/domains/analytics/presentation/require-org-admin.js";

import { MongooseScanRepository } from "@/domains/scan/infrastructure/mongoose-scan-repository.js";
import { FetchOmrServiceClient } from "@/domains/scan/infrastructure/fetch-omr-service-client.js";
import { ScanSheetUseCase } from "@/domains/scan/application/scan-sheet.js";
import { ListScansByExamUseCase } from "@/domains/scan/application/list-scans-by-exam.js";
import { ApproveScanUseCase } from "@/domains/scan/application/approve-scan.js";
import { DeleteScanUseCase } from "@/domains/scan/application/delete-scan.js";
import type { OmrServiceClient } from "@/domains/scan/application/omr-service-client.js";
import { OmrServiceError } from "@/domains/scan/domain/scan-errors.js";
import { ScanController } from "@/domains/scan/presentation/scan-controller.js";
import { makeScanRouter } from "@/domains/scan/presentation/scan-routes.js";

import { MongooseWalletRepository } from "@/domains/billing/infrastructure/mongoose-wallet-repository.js";
import { MongooseLedgerRepository } from "@/domains/billing/infrastructure/mongoose-ledger-repository.js";
import { MongooseSubscriptionRepository } from "@/domains/billing/infrastructure/mongoose-subscription-repository.js";
import { MongooseOrganizationBillingSettingsRepository } from "@/domains/billing/infrastructure/mongoose-organization-billing-settings-repository.js";
import { AtomicDebitService } from "@/domains/billing/infrastructure/atomic-debit-service.js";
import { assertPlansConfigured } from "@/domains/billing/infrastructure/stripe/plan-price-mapping.js";
import { GrantWelcomeCreditsUseCase } from "@/domains/billing/application/grant-welcome-credits.js";
import { GetBalanceUseCase } from "@/domains/billing/application/get-balance.js";
import { ListLedgerUseCase } from "@/domains/billing/application/list-ledger.js";
import { EnsureSufficientBalanceUseCase } from "@/domains/billing/application/ensure-sufficient-balance.js";
import { DebitCreditsUseCase } from "@/domains/billing/application/debit-credits.js";
import { DefaultBillingService } from "@/domains/billing/application/billing-service.js";
import { DefaultBillingTargetResolver } from "@/domains/billing/application/billing-target-resolver.js";
import { GetCurrentSubscriptionUseCase } from "@/domains/billing/application/get-current-subscription.js";
import { CreateCheckoutSessionUseCase } from "@/domains/billing/application/create-checkout-session.js";
import { CreateTopupCheckoutSessionUseCase } from "@/domains/billing/application/create-topup-checkout-session.js";
import { CreatePortalSessionUseCase } from "@/domains/billing/application/create-portal-session.js";
import { HandleStripeWebhookUseCase } from "@/domains/billing/application/handle-stripe-webhook.js";
import { ExpireStaleWalletsUseCase } from "@/domains/billing/application/expire-stale-wallets.js";
import { CreatePixTopupUseCase } from "@/domains/billing/application/create-pix-topup.js";
import { GetPixTopupStatusUseCase } from "@/domains/billing/application/get-pix-topup-status.js";
import { HandleAbacatePayWebhookUseCase } from "@/domains/billing/application/handle-abacatepay-webhook.js";
import { MongoosePixTopupIntentRepository } from "@/domains/billing/infrastructure/mongoose-pix-topup-intent-repository.js";
import {
  getAbacatePayClient,
  isAbacatePayConfigured,
  type AbacatePayClient,
} from "@/domains/billing/infrastructure/abacatepay/abacatepay-client.js";
import { SmtpBillingMailer } from "@/domains/billing/infrastructure/smtp-billing-mailer.js";
import { BillingController } from "@/domains/billing/presentation/billing-controller.js";
import {
  makeBillingAuthedRouter,
  makeBillingInternalRouter,
  makeBillingPublicRouter,
} from "@/domains/billing/presentation/billing-routes.js";

import { MongooseInvoiceRepository } from "@/domains/invoicing/infrastructure/mongoose-invoice-repository.js";
import { BaTakerResolver } from "@/domains/invoicing/infrastructure/ba-taker-resolver.js";
import { SmtpInvoiceMailer } from "@/domains/invoicing/infrastructure/smtp-invoice-mailer.js";
import { IssueInvoiceUseCase } from "@/domains/invoicing/application/issue-invoice.js";
import { ProcessPendingInvoicesUseCase } from "@/domains/invoicing/application/process-pending-invoices.js";
import { HandleProviderWebhookUseCase } from "@/domains/invoicing/application/handle-provider-webhook.js";
import {
  ListInvoicesForOwnerUseCase,
  ListInvoicesForOrganizationUseCase,
} from "@/domains/invoicing/application/list-invoices-for-owner.js";
import {
  getLucidaEmitterConfig,
  isInvoicingConfigured,
} from "@/domains/invoicing/infrastructure/nfeio/lucida-emitter-config.js";
import { getNfeIoInvoiceProvider } from "@/domains/invoicing/infrastructure/nfeio/nfeio-invoice-provider.js";
import { InvoicingController } from "@/domains/invoicing/presentation/invoicing-controller.js";
import {
  makeInvoicingAuthedRouter,
  makeInvoicingInternalRouter,
  makeInvoicingPublicRouter,
} from "@/domains/invoicing/presentation/invoicing-routes.js";

import { MongooseTicketRepository } from "@/domains/tickets/infrastructure/mongoose-ticket-repository.js";
import { BaUserLookup } from "@/domains/tickets/infrastructure/ba-user-lookup.js";
import { NotificationsTicketNotifier } from "@/domains/tickets/infrastructure/notifications-ticket-notifier.js";
import {
  ResendTicketMailer,
  isTicketsConfigured,
} from "@/domains/tickets/infrastructure/resend-ticket-mailer.js";
import { HandleInboundEmailUseCase } from "@/domains/tickets/application/handle-inbound-email.js";
import { ReplyToTicketUseCase } from "@/domains/tickets/application/reply-to-ticket.js";
import { SendNewEmailUseCase } from "@/domains/tickets/application/send-new-email.js";
import {
  CloseTicketUseCase,
  MarkReadTicketUseCase,
  ReopenTicketUseCase,
} from "@/domains/tickets/application/close-ticket.js";
import { BulkUpdateStatusUseCase } from "@/domains/tickets/application/bulk-update-status.js";
import { ListTicketsUseCase } from "@/domains/tickets/application/list-tickets.js";
import { GetTicketUseCase } from "@/domains/tickets/application/get-ticket.js";
import { TicketsController } from "@/domains/tickets/presentation/tickets-controller.js";
import {
  makeTicketsPublicRouter,
  makeTicketsStaffRouter,
} from "@/domains/tickets/presentation/tickets-routes.js";

import { SupportController } from "@/domains/support/presentation/support-controller.js";
import { CreateTicketFromFormUseCase } from "@/domains/tickets/application/create-ticket-from-form.js";
import { makeSupportRouter } from "@/domains/support/presentation/support-routes.js";

import { MongooseApiKeyRepository } from "@/domains/api-access/infrastructure/mongoose-api-key-repository.js";
import { MongooseWebhookEndpointRepository } from "@/domains/api-access/infrastructure/mongoose-webhook-endpoint-repository.js";
import {
  HmacApiKeyGenerator,
  RandomWebhookSecretGenerator,
} from "@/domains/api-access/infrastructure/hmac-key-generator.js";
import { CreateApiKeyUseCase } from "@/domains/api-access/application/create-api-key.js";
import { ListApiKeysUseCase } from "@/domains/api-access/application/list-api-keys.js";
import { RevokeApiKeyUseCase } from "@/domains/api-access/application/revoke-api-key.js";
import { CreateWebhookEndpointUseCase } from "@/domains/api-access/application/create-webhook-endpoint.js";
import { ListWebhookEndpointsUseCase } from "@/domains/api-access/application/list-webhook-endpoints.js";
import { UpdateWebhookEndpointUseCase } from "@/domains/api-access/application/update-webhook-endpoint.js";
import { RotateWebhookSecretUseCase } from "@/domains/api-access/application/rotate-webhook-secret.js";
import { DeleteWebhookEndpointUseCase } from "@/domains/api-access/application/delete-webhook-endpoint.js";
import { ApiAccessController } from "@/domains/api-access/presentation/api-access-controller.js";
import { makeApiAccessRouter } from "@/domains/api-access/presentation/api-access-routes.js";

import { MongoKintalReadRepository } from "@/domains/kintal/infrastructure/mongo-kintal-read-repository.js";
import { MongoStaffRepository } from "@/domains/kintal/infrastructure/mongo-staff-repository.js";
import { MongoKintalUsersRepository } from "@/domains/kintal/infrastructure/mongo-kintal-users-repository.js";
import { MongoKintalInstitutionsRepository } from "@/domains/kintal/infrastructure/mongo-kintal-institutions-repository.js";
import { MongooseImpersonateSessionRepository } from "@/domains/kintal/infrastructure/mongoose-impersonate-session-repository.js";
import { BaUserLookupById } from "@/domains/iam/infrastructure/ba-user-lookup-by-id.js";
import { StartKintalImpersonateUseCase } from "@/domains/kintal/application/start-kintal-impersonate.js";
import { StartInstitutionImpersonateUseCase } from "@/domains/kintal/application/start-institution-impersonate.js";
import { StopKintalImpersonateUseCase } from "@/domains/kintal/application/stop-kintal-impersonate.js";
import { KintalImpersonateController } from "@/domains/kintal/presentation/kintal-impersonate-controller.js";
import { GetDashboardMetricsUseCase } from "@/domains/kintal/application/get-dashboard-metrics.js";
import { ListStaffUseCase } from "@/domains/kintal/application/list-staff.js";
import { PromoteToStaffUseCase } from "@/domains/kintal/application/promote-to-staff.js";
import { RevokeStaffUseCase } from "@/domains/kintal/application/revoke-staff.js";
import { ListKintalUsersUseCase } from "@/domains/kintal/application/list-kintal-users.js";
import { GetKintalUserUseCase } from "@/domains/kintal/application/get-kintal-user.js";
import { UpdateKintalUserUseCase } from "@/domains/kintal/application/update-kintal-user.js";
import { AdjustUserCreditsUseCase } from "@/domains/kintal/application/adjust-user-credits.js";
import { ListInstitutionsUseCase } from "@/domains/kintal/application/list-institutions.js";
import { GetInstitutionUseCase } from "@/domains/kintal/application/get-institution.js";
import { CreateInstitutionUseCase } from "@/domains/kintal/application/create-institution.js";
import { UpdateInstitutionBillingUseCase } from "@/domains/kintal/application/update-institution-billing.js";
import {
  ArchiveInstitutionUseCase,
  UnarchiveInstitutionUseCase,
} from "@/domains/kintal/application/archive-institution.js";
import { AdjustInstitutionCreditsUseCase } from "@/domains/kintal/application/adjust-institution-credits.js";
import { AddInstitutionMemberUseCase } from "@/domains/kintal/application/add-institution-member.js";
import { RemoveInstitutionMemberUseCase } from "@/domains/kintal/application/remove-institution-member.js";
import { KintalController } from "@/domains/kintal/presentation/kintal-controller.js";
import { KintalStaffController } from "@/domains/kintal/presentation/kintal-staff-controller.js";
import { KintalUsersController } from "@/domains/kintal/presentation/kintal-users-controller.js";
import { KintalInstitutionsController } from "@/domains/kintal/presentation/kintal-institutions-controller.js";
import { KintalAssistantsController } from "@/domains/kintal/presentation/kintal-assistants-controller.js";
import { makeKintalRouter } from "@/domains/kintal/presentation/kintal-routes.js";
import { makeRequireStaff } from "@/domains/kintal/presentation/require-staff.js";

import { MongooseExpenseRepository } from "@/domains/finance/infrastructure/mongoose-expense-repository.js";
import { LedgerRevenueSource } from "@/domains/finance/infrastructure/ledger-revenue-source.js";
import { GetFinancialSummaryUseCase } from "@/domains/finance/application/get-financial-summary.js";
import { CreateExpenseUseCase } from "@/domains/finance/application/create-expense.js";
import { DeleteExpenseUseCase } from "@/domains/finance/application/delete-expense.js";
import { ListExpensesUseCase } from "@/domains/finance/application/list-expenses.js";
import { FinanceController } from "@/domains/finance/presentation/finance-controller.js";
import { makeFinanceRouter } from "@/domains/finance/presentation/finance-routes.js";

import { MongooseCardRepository } from "@/domains/kanban/infrastructure/mongoose-card-repository.js";
import { ListCardsUseCase } from "@/domains/kanban/application/list-cards.js";
import { CreateCardUseCase } from "@/domains/kanban/application/create-card.js";
import { UpdateCardUseCase } from "@/domains/kanban/application/update-card.js";
import { MoveCardUseCase } from "@/domains/kanban/application/move-card.js";
import { DeleteCardUseCase } from "@/domains/kanban/application/delete-card.js";
import { KanbanController } from "@/domains/kanban/presentation/kanban-controller.js";
import { makeKanbanRouter } from "@/domains/kanban/presentation/kanban-routes.js";

import { MongooseNotificationRepository } from "@/domains/notifications/infrastructure/mongoose-notification-repository.js";
import { MongoAudienceResolver } from "@/domains/notifications/infrastructure/mongo-audience-resolver.js";
import { SendNotificationUseCase } from "@/domains/notifications/application/send-notification.js";
import { ListInboxUseCase } from "@/domains/notifications/application/list-inbox.js";
import { CountUnreadUseCase } from "@/domains/notifications/application/count-unread.js";
import { MarkAsReadUseCase } from "@/domains/notifications/application/mark-as-read.js";
import { MarkAllAsReadUseCase } from "@/domains/notifications/application/mark-all-as-read.js";
import { DismissNotificationUseCase } from "@/domains/notifications/application/dismiss-notification.js";
import { ListCampaignsUseCase } from "@/domains/notifications/application/list-campaigns.js";
import { GetCampaignUseCase } from "@/domains/notifications/application/get-campaign.js";
import { DeleteCampaignUseCase } from "@/domains/notifications/application/delete-campaign.js";
import { NotificationReceiverController } from "@/domains/notifications/presentation/notification-receiver-controller.js";
import { NotificationSenderController } from "@/domains/notifications/presentation/notification-sender-controller.js";
import {
  makeNotificationReceiverRouter,
  makeNotificationSenderRouters,
} from "@/domains/notifications/presentation/notification-routes.js";

import { MongooseOrganizationPreferencesRepository } from "@/domains/organization-preferences/infrastructure/mongoose-organization-preferences-repository.js";
import { GetOrganizationPreferencesUseCase } from "@/domains/organization-preferences/application/get-organization-preferences.js";
import { UpdateOrganizationPreferencesUseCase } from "@/domains/organization-preferences/application/update-organization-preferences.js";
import { OrganizationPreferencesController } from "@/domains/organization-preferences/presentation/organization-preferences-controller.js";
import { makeOrganizationPreferencesRouter } from "@/domains/organization-preferences/presentation/organization-preferences-routes.js";

import { makeRequireApiKey } from "@/domains/api-access/presentation/middleware/require-api-key.js";
import { ListPublicClassesUseCase } from "@/domains/public-api/application/list-public-classes.js";
import { CreatePublicClassUseCase } from "@/domains/public-api/application/create-public-class.js";
import { ListPublicStudentsByClassUseCase } from "@/domains/public-api/application/list-public-students.js";
import { CreatePublicStudentsBatchUseCase } from "@/domains/public-api/application/create-public-students-batch.js";
import { IssueExamLinkUseCase } from "@/domains/public-api/application/issue-exam-link.js";
import { GetPublicExamResultsUseCase } from "@/domains/public-api/application/get-public-exam-results.js";
import { PublicClassesController } from "@/domains/public-api/presentation/public-classes-controller.js";
import { PublicStudentsController } from "@/domains/public-api/presentation/public-students-controller.js";
import { PublicExamsController } from "@/domains/public-api/presentation/public-exams-controller.js";
import { makePublicApiRouter } from "@/domains/public-api/presentation/public-api-routes.js";

import { DispatchSubmissionCompletedUseCase } from "@/domains/webhook-dispatch/application/dispatch-submission-completed.js";
import { FetchWebhookEventSender } from "@/domains/webhook-dispatch/infrastructure/fetch-webhook-event-sender.js";
import { BaTeacherInfoLookup } from "@/domains/webhook-dispatch/infrastructure/ba-teacher-info-lookup.js";

import { MongooseRoadmapItemRepository } from "@/domains/roadmap/infrastructure/mongoose-roadmap-item-repository.js";
import { MongooseRoadmapVoteRepository } from "@/domains/roadmap/infrastructure/mongoose-roadmap-vote-repository.js";
import { ListRoadmapUseCase } from "@/domains/roadmap/application/list-roadmap.js";
import { SuggestFeatureUseCase } from "@/domains/roadmap/application/suggest-feature.js";
import { VoteOnItemUseCase } from "@/domains/roadmap/application/vote-on-item.js";
import { UnvoteItemUseCase } from "@/domains/roadmap/application/unvote-item.js";
import { CreateRoadmapItemUseCase } from "@/domains/roadmap/application/create-roadmap-item.js";
import { UpdateRoadmapItemUseCase } from "@/domains/roadmap/application/update-roadmap-item.js";
import { DeleteRoadmapItemUseCase } from "@/domains/roadmap/application/delete-roadmap-item.js";
import { RoadmapController } from "@/domains/roadmap/presentation/roadmap-controller.js";
import { RoadmapStaffController } from "@/domains/roadmap/presentation/roadmap-staff-controller.js";
import { makeRoadmapRouter } from "@/domains/roadmap/presentation/roadmap-routes.js";

export async function buildApp(): Promise<Express> {
  await connectMongo(env.MONGODB_URI);

  const authDb = await getAuthDb(env.MONGODB_URI);

  // --- billing ---
  // Precisa existir antes da auth pra alimentar o hook de welcome credits,
  // e antes dos controllers de ai-ops pra gating de saldo.
  assertPlansConfigured();
  const walletRepository = new MongooseWalletRepository();
  const ledgerRepository = new MongooseLedgerRepository();
  const subscriptionsRepo = new MongooseSubscriptionRepository();
  const orgBillingSettingsRepo =
    new MongooseOrganizationBillingSettingsRepository();
  const atomicDebitService = new AtomicDebitService();
  const grantWelcomeCreditsUseCase = new GrantWelcomeCreditsUseCase(
    walletRepository,
    ledgerRepository,
  );
  const billingService = new DefaultBillingService(
    new EnsureSufficientBalanceUseCase(walletRepository),
    new DebitCreditsUseCase(
      walletRepository,
      ledgerRepository,
      atomicDebitService,
    ),
    new DefaultBillingTargetResolver(orgBillingSettingsRepo),
    orgBillingSettingsRepo,
    ledgerRepository,
  );

  const auth = createAuth(authDb, {
    onUserCreated: async (userId) => {
      await grantWelcomeCreditsUseCase.execute({
        ownerId: userId,
        amount: env.WELCOME_CREDITS,
      });
    },
  });
  // org-aware deps que `requireAuth` precisa pra resolver impersonate.
  // Mantemos a definição cedo (antes do requireAuth) pra não duplicar.
  const orgMembersRepository = new BaOrganizationMembersRepository(authDb);
  const orgInvitationsRepository = new BaOrganizationInvitationsRepository(
    authDb,
  );
  // teacher_assistants alimenta o "modo auxiliar" no requireAuth — sem
  // o repo, auxiliares logam mas não têm override do userId.
  const teacherAssistantsRepository = new MongoTeacherAssistantRepository(
    authDb,
  );
  // Lookup mínimo de user pelo id — alimenta o modo staff impersonate
  // no requireAuth e o fallback de nome no analytics.impersonateState.
  const userLookupById = new BaUserLookupById(authDb);
  const requireAuth = makeRequireAuth(auth, {
    orgMembersRepository,
    teacherAssistantsRepository,
    userLookup: userLookupById,
    authSecret: env.AUTH_SECRET,
  });

  // --- repositories ---
  const courseRepository = new MongooseCourseRepository();
  const classRepository = new MongooseClassRepository();
  const studentRepository = new MongooseStudentRepository();
  const examRepository = new MongooseExamRepository();
  const submissionRepository = new MongooseSubmissionRepository();

  // --- course domain ---
  const courseController = new CourseController({
    createCourse: new CreateCourseUseCase(courseRepository),
    listCourses: new ListCoursesUseCase(courseRepository, classRepository),
    getCourse: new GetCourseUseCase(
      courseRepository,
      classRepository,
      studentRepository,
      examRepository,
    ),
    updateCourse: new UpdateCourseUseCase(courseRepository),
    deleteCourse: new DeleteCourseUseCase(courseRepository, classRepository),
  });

  // --- class domain ---
  const classController = new ClassController({
    createClass: new CreateClassUseCase(classRepository, courseRepository),
    listClasses: new ListClassesUseCase(classRepository, studentRepository, examRepository),
    getClass: new GetClassUseCase(
      classRepository,
      courseRepository,
      studentRepository,
      examRepository,
    ),
    updateClass: new UpdateClassUseCase(
      classRepository,
      courseRepository,
      studentRepository,
      examRepository,
      submissionRepository,
    ),
    deleteClass: new DeleteClassUseCase(classRepository, studentRepository, examRepository),
  });

  // --- student domain ---
  const studentController = new StudentController({
    createStudent: new CreateStudentUseCase(studentRepository, classRepository),
    listStudentsByClass: new ListStudentsByClassUseCase(studentRepository, classRepository),
    updateStudent: new UpdateStudentUseCase(studentRepository),
    deleteStudent: new DeleteStudentUseCase(studentRepository),
  });

  // --- classroom integration (Google Classroom) ---
  // Plugin opcional: sem as envs CLASSROOM_OAUTH_*/ENC_KEY, injetamos stubs
  // que devolvem 503 — o card aparece indisponível e o resto da Lucida segue.
  const classroomEnabled = Boolean(
    env.CLASSROOM_OAUTH_CLIENT_ID &&
      env.CLASSROOM_OAUTH_CLIENT_SECRET &&
      env.CLASSROOM_TOKEN_ENC_KEY,
  );
  const classroomRedirectUri =
    env.CLASSROOM_OAUTH_REDIRECT_URI ??
    `${env.AUTH_BASE_URL}/v1/integrations/classroom/oauth/callback`;
  const classroomOAuth: ClassroomOAuthClient = classroomEnabled
    ? new GoogleClassroomOAuthClient(
        env.CLASSROOM_OAUTH_CLIENT_ID!,
        env.CLASSROOM_OAUTH_CLIENT_SECRET!,
        classroomRedirectUri,
      )
    : new UnavailableClassroomOAuthClient();
  const classroomApi: ClassroomApiClient = classroomEnabled
    ? new GoogleClassroomApiClient()
    : new UnavailableClassroomApiClient();
  const classroomCipher: TokenCipher = classroomEnabled
    ? new AesGcmTokenCipher(env.CLASSROOM_TOKEN_ENC_KEY!)
    : new UnavailableTokenCipher();

  const classroomCredentialRepository = new MongooseClassroomCredentialRepository(
    classroomCipher,
  );
  const ensureFreshCredential = new EnsureFreshCredentialService(
    classroomOAuth,
    classroomCredentialRepository,
  );
  const reconcileStudentsUseCase = new ReconcileStudentsUseCase(
    classroomCredentialRepository,
    ensureFreshCredential,
    classroomApi,
    classRepository,
    studentRepository,
  );
  const classroomController = new ClassroomController({
    getStatus: new GetConnectionStatusUseCase(classroomCredentialRepository),
    buildAuthorizeUrl: new BuildAuthorizeUrlUseCase(classroomOAuth, env.AUTH_SECRET),
    completeOAuth: new CompleteOAuthUseCase(
      classroomOAuth,
      classroomCredentialRepository,
      env.AUTH_SECRET,
    ),
    disconnect: new DisconnectClassroomUseCase(classroomCredentialRepository),
    listCourses: new ListClassroomCoursesUseCase(
      classroomCredentialRepository,
      ensureFreshCredential,
      classroomApi,
      classRepository,
    ),
    importCourse: new ImportClassroomCourseUseCase(
      classroomCredentialRepository,
      courseRepository,
      new CreateCourseUseCase(courseRepository),
      classRepository,
      reconcileStudentsUseCase,
    ),
    reconcile: reconcileStudentsUseCase,
  });

  // --- exam domain ---
  const examController = new ExamController({
    createExam: new CreateExamUseCase(examRepository, classRepository),
    listExamsByClass: new ListExamsByClassUseCase(
      examRepository,
      classRepository,
      submissionRepository,
    ),
    getExam: new GetExamUseCase(examRepository),
    updateExam: new UpdateExamUseCase(examRepository),
    deleteExam: new DeleteExamUseCase(examRepository),
    exportExamDocx: new ExportExamDocxUseCase(
      examRepository,
      new DocxExamBuilderImpl(),
    ),
    copyExamToClass: new CopyExamToClassUseCase(examRepository, classRepository),
  });

  // --- ai-ops domain ---
  const extractors = [new PdfExtractor(), new DocxExtractor(), new TextExtractor()];
  const transcriptFetcher = new YoutubeTranscriptFetcher();
  const questionGenerator = new OpenAiQuestionGenerator();
  const openQuestionGenerator = new OpenAiOpenQuestionGenerator();
  const openAnswerGrader = new OpenAiAnswerGrader();
  // R2 telemetria — só atua com R2_VERIFY=1 (gate dentro do use case).
  const answerExplanationVerifier = new AnswerExplanationVerifier();
  const aiController = new AiController({
    generateExamQuestions: new GenerateExamQuestionsUseCase(
      extractors,
      transcriptFetcher,
      questionGenerator,
      billingService,
      answerExplanationVerifier,
    ),
    regenerateQuestion: new RegenerateQuestionUseCase(
      extractors,
      transcriptFetcher,
      questionGenerator,
      billingService,
    ),
    estimateExamGeneration: new EstimateExamGenerationUseCase(),
    generateOpenQuestions: new GenerateOpenQuestionsUseCase(
      extractors,
      transcriptFetcher,
      openQuestionGenerator,
      billingService,
    ),
    estimateOpenGeneration: new EstimateOpenGenerationUseCase(),
    regenerateOpenQuestion: new RegenerateOpenQuestionUseCase(
      extractors,
      transcriptFetcher,
      openQuestionGenerator,
      billingService,
    ),
    estimateGrading: new EstimateGradingUseCase(
      examRepository,
      submissionRepository,
    ),
    gradeOpenAnswers: new GradeOpenAnswersUseCase(
      examRepository,
      submissionRepository,
      billingService,
      openAnswerGrader,
    ),
  });

  // --- lesson-plan generation (módulo "Aulas") ---
  const lessonPlanGenerator = new OpenAiLessonPlanGenerator();
  const lessonPlanAiController = new LessonPlanAiController({
    generateLessonPlan: new GenerateLessonPlanUseCase(
      extractors,
      transcriptFetcher,
      lessonPlanGenerator,
      billingService,
    ),
    regenerateLessonBlock: new RegenerateLessonBlockUseCase(
      extractors,
      transcriptFetcher,
      lessonPlanGenerator,
      billingService,
    ),
    estimateLessonPlan: new EstimateLessonPlanUseCase(),
  });

  // --- lesson-plan persistence (módulo "Aulas") ---
  const lessonPlanRepository = new MongooseLessonPlanRepository();
  const lessonPlanController = new LessonPlanController({
    createLessonPlan: new CreateLessonPlanUseCase(
      lessonPlanRepository,
      classRepository,
    ),
    listLessonPlansByClass: new ListLessonPlansByClassUseCase(
      lessonPlanRepository,
      classRepository,
    ),
    getLessonPlan: new GetLessonPlanUseCase(lessonPlanRepository),
    updateLessonPlan: new UpdateLessonPlanUseCase(lessonPlanRepository),
    deleteLessonPlan: new DeleteLessonPlanUseCase(lessonPlanRepository),
    duplicateLessonPlan: new DuplicateLessonPlanUseCase(lessonPlanRepository),
    archiveLessonPlan: new ArchiveLessonPlanUseCase(lessonPlanRepository),
    exportLessonPlanDocx: new ExportLessonPlanDocxUseCase(
      lessonPlanRepository,
      new DocxLessonPlanBuilderImpl(),
    ),
  });

  // --- slide-deck generation (módulo "Apresentações") ---
  const slideDeckGenerator = new OpenAiSlideDeckGenerator();
  // Sem PEXELS_API_KEY, o provider no-op devolve [] e os slides caem pra
  // tipografia (degradação graciosa — mesmo padrão do UnavailableOmrClient).
  const imageProvider = env.PEXELS_API_KEY
    ? new PexelsImageProvider(env.PEXELS_API_KEY)
    : new UnavailableImageProvider();
  const slideDeckAiController = new SlideDeckAiController({
    generateDeck: new GenerateDeckUseCase(
      extractors,
      transcriptFetcher,
      slideDeckGenerator,
      billingService,
      imageProvider,
    ),
    regenerateSlide: new RegenerateSlideUseCase(
      extractors,
      transcriptFetcher,
      slideDeckGenerator,
      billingService,
      imageProvider,
    ),
    estimateDeckCredits: new EstimateDeckCreditsUseCase(),
    lessonPlans: lessonPlanRepository,
    imageProvider,
  });

  // --- slide-deck persistence (módulo "Apresentações") ---
  const slideDeckRepository = new MongooseSlideDeckRepository();
  const slideDeckController = new SlideDeckController({
    createSlideDeck: new CreateSlideDeckUseCase(slideDeckRepository),
    getSlideDeck: new GetSlideDeckUseCase(slideDeckRepository),
    listSlideDecks: new ListSlideDecksUseCase(slideDeckRepository),
    updateSlideDeck: new UpdateSlideDeckUseCase(slideDeckRepository),
    reorderSlides: new ReorderSlidesUseCase(slideDeckRepository),
    deleteSlideDeck: new DeleteSlideDeckUseCase(slideDeckRepository),
  });

  // --- webhook dispatcher (precisa existir antes do submission/scan
  // pra ser injetado nos use cases que finalizam submissões) ---
  const webhookEndpointRepositoryForDispatch =
    new MongooseWebhookEndpointRepository();
  const submissionCompletedDispatcher =
    new DispatchSubmissionCompletedUseCase(
      examRepository,
      classRepository,
      studentRepository,
      webhookEndpointRepositoryForDispatch,
      new BaTeacherInfoLookup(authDb),
      new FetchWebhookEventSender(),
    );

  // --- submission domain ---
  const submissionController = new SubmissionController({
    getPublicExam: new GetPublicExamUseCase(examRepository),
    getPublicResult: new GetPublicResultUseCase(
      examRepository,
      submissionRepository,
    ),
    beginExam: new BeginExamUseCase(
      examRepository,
      studentRepository,
      submissionRepository,
    ),
    beginExamByEmail: new BeginExamByEmailUseCase(
      examRepository,
      classRepository,
      studentRepository,
      submissionRepository,
    ),
    beginExamFromToken: new BeginExamFromTokenUseCase(
      examRepository,
      studentRepository,
      submissionRepository,
    ),
    resolveExamLinkToken: new ResolveExamLinkTokenUseCase(
      examRepository,
      studentRepository,
      submissionRepository,
    ),
    authSecret: env.AUTH_SECRET,
    submitExam: new SubmitExamUseCase(
      examRepository,
      submissionRepository,
      submissionCompletedDispatcher,
    ),
    listSubmissionsByExam: new ListSubmissionsByExamUseCase(
      examRepository,
      submissionRepository,
    ),
    getSubmissionForGrading: new GetSubmissionForGradingUseCase(
      examRepository,
      submissionRepository,
    ),
    gradeOpenAnswersManually: new GradeOpenAnswersManuallyUseCase(
      examRepository,
      submissionRepository,
      submissionCompletedDispatcher,
    ),
    approveOpenGrades: new ApproveOpenGradesUseCase(
      submissionRepository,
      submissionCompletedDispatcher,
    ),
    countPendingCorrections: new CountPendingCorrectionsUseCase(
      submissionRepository,
    ),
    listGradingQueue: new ListGradingQueueUseCase(
      submissionRepository,
      examRepository,
      classRepository,
      courseRepository,
    ),
  });

  // --- scan (OMR) domain ---
  const scanRepository = new MongooseScanRepository();
  const omrClient: OmrServiceClient = env.OMR_SERVICE_URL
    ? new FetchOmrServiceClient(env.OMR_SERVICE_URL, env.OMR_SERVICE_TIMEOUT_MS)
    : new UnavailableOmrClient();
  const approveScanUseCase = new ApproveScanUseCase(
    examRepository,
    scanRepository,
    submissionRepository,
    submissionCompletedDispatcher,
  );
  const scanController = new ScanController({
    scanSheet: new ScanSheetUseCase(
      examRepository,
      studentRepository,
      submissionRepository,
      scanRepository,
      omrClient,
      approveScanUseCase,
    ),
    listScansByExam: new ListScansByExamUseCase(examRepository, scanRepository),
    approveScan: approveScanUseCase,
    deleteScan: new DeleteScanUseCase(scanRepository),
  });

  // --- analytics domain ---
  // Os repos org-aware (orgMembersRepository, orgInvitationsRepository) já
  // foram criados acima pra alimentar o requireAuth (impersonate). Reusamos.
  const analyticsController = new AnalyticsController({
    computeOverview: new ComputeOverviewUseCase(classRepository, examRepository),
    computeClassOverview: new ComputeClassOverviewUseCase(
      classRepository,
      examRepository,
    ),
    computeStudentOverview: new ComputeStudentOverviewUseCase(
      studentRepository,
      classRepository,
      examRepository,
    ),
    computeExamOverview: new ComputeExamOverviewUseCase(
      examRepository,
      classRepository,
    ),
    computeOrgOverview: new ComputeOrgOverviewUseCase(orgMembersRepository),
    listOrgMembers: new ListOrgMembersAndInvitationsUseCase(
      orgMembersRepository,
      orgInvitationsRepository,
    ),
    acceptInviteWithSignup: new AcceptInviteWithSignupUseCase(
      new BaInvitationAcceptor(auth, authDb),
    ),
    getOrgBilling: new GetOrgBillingUseCase(
      walletRepository,
      ledgerRepository,
      orgBillingSettingsRepo,
      orgMembersRepository,
    ),
    computeTeacherOverview: new ComputeTeacherOverviewUseCase(
      orgMembersRepository,
      classRepository,
      examRepository,
      courseRepository,
      ledgerRepository,
    ),
    exportTeacherData: new ExportTeacherDataUseCase(
      orgMembersRepository,
      classRepository,
      examRepository,
      courseRepository,
    ),
    orgMembersRepository,
    orgInvitationsRepository,
    orgBillingSettingsRepository: orgBillingSettingsRepo,
    userLookup: userLookupById,
  });

  // --- billing controller (precisa do auth pra recuperar email do user no
  // checkout; por isso fica aqui embaixo) ---
  // AbacatePay (PIX) é opcional — sem env, o client não é instanciado
  // e o controller devolve 503 nas rotas /pix. Use cases ainda são
  // construídos com um stub pra simplificar a injeção.
  const pixIntentRepository = new MongoosePixTopupIntentRepository();
  const abacatePayClient = isAbacatePayConfigured()
    ? getAbacatePayClient()
    : new UnavailableAbacatePayClient();
  const billingMailer = new SmtpBillingMailer();

  // --- invoicing (NFS-e via NFE.io) ---
  // Best-effort: quando NFE.io não está configurado (NFEIO_API_KEY +
  // NFEIO_COMPANY_ID), passamos `null` pros webhook handlers e a
  // emissão é silenciosamente pulada. Pagamentos seguem normalmente.
  // Mesmo padrão de Stripe/AbacatePay (módulo offline ≠ api offline).
  const invoiceRepository = new MongooseInvoiceRepository();
  const lucidaEmitter = isInvoicingConfigured()
    ? getLucidaEmitterConfig()
    : null;
  if (!lucidaEmitter) {
    console.warn(
      "[invoicing] NFE.io não configurado — emissão de NFS-e desligada.",
    );
  }
  const issueInvoiceUseCase: IssueInvoiceUseCase | null = lucidaEmitter
    ? new IssueInvoiceUseCase(
        invoiceRepository,
        new BaTakerResolver(authDb),
        lucidaEmitter,
      )
    : null;
  // Worker que envia pendentes pro NFE.io. Compartilha o mesmo provider
  // singleton — `getNfeIoInvoiceProvider` cacheia internamente.
  const processPendingInvoicesUseCase: ProcessPendingInvoicesUseCase | null =
    lucidaEmitter
      ? new ProcessPendingInvoicesUseCase(
          invoiceRepository,
          getNfeIoInvoiceProvider(lucidaEmitter),
        )
      : null;
  // Webhook handler — atualiza status quando NFE.io confirma autorização
  // pela prefeitura, e dispara email com PDF anexo na transição → issued.
  const handleProviderWebhookUseCase: HandleProviderWebhookUseCase | null =
    lucidaEmitter
      ? new HandleProviderWebhookUseCase({
          invoices: invoiceRepository,
          mailer: new SmtpInvoiceMailer(),
        })
      : null;
  const invoicingController = new InvoicingController({
    processPending: processPendingInvoicesUseCase,
    handleProviderWebhook: handleProviderWebhookUseCase,
    // Listagem é safe sem NFE.io — devolve [] quando não há Invoice.
    listForOwner: new ListInvoicesForOwnerUseCase(invoiceRepository),
    listForOrganization: new ListInvoicesForOrganizationUseCase(
      invoiceRepository,
    ),
  });

  // --- tickets ---
  // Mailer só é instanciado quando TICKETS_FROM_EMAIL está setado. Sem
  // ele, reply fica off — webhook inbound continua funcionando (cria
  // ticket) e UI lista normalmente. HandleInboundEmail depende também
  // do secret do Resend Inbound pra a rota responder.
  //
  // Notifier reusa o `notificationRepository` do domínio notifications —
  // declarado mais abaixo no main, antecipamos aqui pra cobrir o ciclo
  // (tickets antes de notifications no flow). Mongoose model é singleton,
  // então é seguro.
  const ticketRepository = new MongooseTicketRepository();
  const ticketNotificationRepository = new MongooseNotificationRepository();
  const ticketNotifier = new NotificationsTicketNotifier(
    authDb,
    ticketNotificationRepository,
  );
  const ticketMailer = isTicketsConfigured() && env.TICKETS_FROM_EMAIL
    ? new ResendTicketMailer(env.TICKETS_FROM_EMAIL)
    : null;
  const handleInboundEmailUseCase = env.TICKETS_INBOUND_SECRET
    ? new HandleInboundEmailUseCase(
        ticketRepository,
        new BaUserLookup(authDb),
        ticketNotifier,
      )
    : null;
  const replyToTicketUseCase = ticketMailer
    ? new ReplyToTicketUseCase(ticketRepository, ticketMailer)
    : null;
  const sendNewEmailUseCase = ticketMailer
    ? new SendNewEmailUseCase(
        ticketRepository,
        ticketMailer,
        new BaUserLookup(authDb),
      )
    : null;
  const ticketsController = new TicketsController({
    handleInboundEmail: handleInboundEmailUseCase,
    list: new ListTicketsUseCase(ticketRepository),
    get: new GetTicketUseCase(ticketRepository),
    reply: replyToTicketUseCase,
    sendNew: sendNewEmailUseCase,
    markDone: new CloseTicketUseCase(ticketRepository),
    markRead: new MarkReadTicketUseCase(ticketRepository),
    reopen: new ReopenTicketUseCase(ticketRepository),
    bulkUpdateStatus: new BulkUpdateStatusUseCase(ticketRepository),
    repository: ticketRepository,
  });

  const billingController = new BillingController({
    getBalance: new GetBalanceUseCase(walletRepository),
    listLedger: new ListLedgerUseCase(ledgerRepository),
    getCurrentSubscription: new GetCurrentSubscriptionUseCase(subscriptionsRepo),
    createCheckoutSession: new CreateCheckoutSessionUseCase(subscriptionsRepo),
    createTopupCheckoutSession: new CreateTopupCheckoutSessionUseCase(
      subscriptionsRepo,
    ),
    createPortalSession: new CreatePortalSessionUseCase(subscriptionsRepo),
    handleStripeWebhook: new HandleStripeWebhookUseCase({
      subscriptions: subscriptionsRepo,
      wallets: walletRepository,
      ledger: ledgerRepository,
      mailer: billingMailer,
      issueInvoice: issueInvoiceUseCase,
    }),
    expireStaleWallets: new ExpireStaleWalletsUseCase(
      walletRepository,
      ledgerRepository,
    ),
    createPixTopup: new CreatePixTopupUseCase(
      abacatePayClient,
      pixIntentRepository,
    ),
    getPixTopupStatus: new GetPixTopupStatusUseCase(pixIntentRepository),
    handleAbacatePayWebhook: new HandleAbacatePayWebhookUseCase({
      intents: pixIntentRepository,
      wallets: walletRepository,
      ledger: ledgerRepository,
      mailer: billingMailer,
      issueInvoice: issueInvoiceUseCase,
    }),
    auth,
  });

  // --- support domain ---
  // Form de /app/ajuda agora cria ticket (origin=form) em vez de
  // enviar email. Staff vê todos os pedidos no Kintal /tickets.
  const supportController = new SupportController(
    new CreateTicketFromFormUseCase(ticketRepository, ticketNotifier),
    auth,
  );

  // --- api-access domain ---
  // Fase A: dashboard de gestão de chaves + webhook endpoints. Sem rotas
  // públicas ainda — o middleware Bearer e os dispatchers virão na Fase B/C.
  const apiKeyRepository = new MongooseApiKeyRepository();
  const webhookEndpointRepository = new MongooseWebhookEndpointRepository();
  const apiKeyGenerator = new HmacApiKeyGenerator(env.AUTH_SECRET);
  const webhookSecretGenerator = new RandomWebhookSecretGenerator();
  const apiAccessController = new ApiAccessController({
    createApiKey: new CreateApiKeyUseCase(apiKeyRepository, apiKeyGenerator),
    listApiKeys: new ListApiKeysUseCase(apiKeyRepository),
    revokeApiKey: new RevokeApiKeyUseCase(apiKeyRepository),
    createWebhookEndpoint: new CreateWebhookEndpointUseCase(
      webhookEndpointRepository,
      webhookSecretGenerator,
    ),
    listWebhookEndpoints: new ListWebhookEndpointsUseCase(
      webhookEndpointRepository,
    ),
    updateWebhookEndpoint: new UpdateWebhookEndpointUseCase(
      webhookEndpointRepository,
    ),
    rotateWebhookSecret: new RotateWebhookSecretUseCase(
      webhookEndpointRepository,
      webhookSecretGenerator,
    ),
    deleteWebhookEndpoint: new DeleteWebhookEndpointUseCase(
      webhookEndpointRepository,
    ),
  });

  // Extraído pra var porque analytics e api-access precisam do mesmo
  // middleware — evita duas instâncias idênticas.
  const requireOrgAdmin = makeRequireOrgAdmin(orgMembersRepository);

  // --- kintal (backoffice interno) ---
  const kintalReadRepository = new MongoKintalReadRepository(authDb);
  const kintalStaffRepository = new MongoStaffRepository(authDb);
  const kintalUsersRepository = new MongoKintalUsersRepository(authDb);
  const kintalController = new KintalController({
    getDashboardMetrics: new GetDashboardMetricsUseCase(kintalReadRepository),
  });
  const kintalStaffController = new KintalStaffController({
    listStaff: new ListStaffUseCase(kintalStaffRepository),
    promoteToStaff: new PromoteToStaffUseCase(kintalStaffRepository),
    revokeStaff: new RevokeStaffUseCase(kintalStaffRepository),
  });
  const kintalUsersController = new KintalUsersController({
    listUsers: new ListKintalUsersUseCase(kintalUsersRepository),
    getUser: new GetKintalUserUseCase(kintalUsersRepository),
    updateUser: new UpdateKintalUserUseCase(kintalUsersRepository),
    adjustCredits: new AdjustUserCreditsUseCase(
      kintalUsersRepository,
      walletRepository,
      ledgerRepository,
      new DebitCreditsUseCase(
        walletRepository,
        ledgerRepository,
        atomicDebitService,
      ),
    ),
  });

  // --- kintal institutions (gestão de orgs no backoffice) ---
  const kintalInstitutionsRepository = new MongoKintalInstitutionsRepository(
    authDb,
    auth,
  );
  const kintalInstitutionsController = new KintalInstitutionsController({
    list: new ListInstitutionsUseCase(kintalInstitutionsRepository),
    get: new GetInstitutionUseCase(kintalInstitutionsRepository),
    create: new CreateInstitutionUseCase(kintalInstitutionsRepository),
    updateBilling: new UpdateInstitutionBillingUseCase(
      kintalInstitutionsRepository,
      orgBillingSettingsRepo,
    ),
    archive: new ArchiveInstitutionUseCase(kintalInstitutionsRepository),
    unarchive: new UnarchiveInstitutionUseCase(kintalInstitutionsRepository),
    adjustCredits: new AdjustInstitutionCreditsUseCase(
      kintalInstitutionsRepository,
      walletRepository,
      ledgerRepository,
      new DebitCreditsUseCase(
        walletRepository,
        ledgerRepository,
        atomicDebitService,
      ),
    ),
    addMember: new AddInstitutionMemberUseCase(kintalInstitutionsRepository),
    removeMember: new RemoveInstitutionMemberUseCase(
      kintalInstitutionsRepository,
    ),
  });

  const requireStaff = makeRequireStaff();

  // --- kintal impersonate (audit log + start/stop) ---
  // O cookie `lucida.impersonate` é o mesmo do impersonate de org admin —
  // o middleware `requireAuth` já distingue os dois caminhos. Aqui o que
  // adicionamos é a UI staff-only de iniciar e o registro append-only.
  const impersonateSessionsRepo = new MongooseImpersonateSessionRepository();
  const startKintalImpersonateUseCase = new StartKintalImpersonateUseCase(
    impersonateSessionsRepo,
    kintalUsersRepository,
  );
  const kintalImpersonateController = new KintalImpersonateController({
    startImpersonate: startKintalImpersonateUseCase,
    startInstitutionImpersonate: new StartInstitutionImpersonateUseCase(
      kintalInstitutionsRepository,
      startKintalImpersonateUseCase,
    ),
    stopImpersonate: new StopKintalImpersonateUseCase(impersonateSessionsRepo),
  });

  // --- finance (kintal financeiro — staff-only) ---
  // Receita vem do credit_ledger cruzado com catálogo PLANS/TOPUPS;
  // despesas são lançadas manualmente em finance_expenses por enquanto.
  const expenseRepository = new MongooseExpenseRepository();
  const revenueSource = new LedgerRevenueSource();
  const financeController = new FinanceController({
    getSummary: new GetFinancialSummaryUseCase(revenueSource, expenseRepository),
    createExpense: new CreateExpenseUseCase(expenseRepository),
    deleteExpense: new DeleteExpenseUseCase(expenseRepository),
    listExpenses: new ListExpensesUseCase(expenseRepository),
  });

  // --- kanban (board interno staff-only) ---
  const cardRepository = new MongooseCardRepository();
  const kanbanController = new KanbanController({
    listCards: new ListCardsUseCase(cardRepository),
    createCard: new CreateCardUseCase(cardRepository),
    updateCard: new UpdateCardUseCase(cardRepository),
    moveCard: new MoveCardUseCase(cardRepository),
    deleteCard: new DeleteCardUseCase(cardRepository),
  });

  // --- notifications (inbox + send para staff/org admin) ---
  const notificationRepository = new MongooseNotificationRepository();
  const audienceResolver = new MongoAudienceResolver(authDb);
  const sendNotification = new SendNotificationUseCase(
    notificationRepository,
    audienceResolver,
  );
  const notificationReceiverController = new NotificationReceiverController({
    listInbox: new ListInboxUseCase(notificationRepository),
    countUnread: new CountUnreadUseCase(notificationRepository),
    markAsRead: new MarkAsReadUseCase(notificationRepository),
    markAllAsRead: new MarkAllAsReadUseCase(notificationRepository),
    dismiss: new DismissNotificationUseCase(notificationRepository),
  });
  const notificationSenderController = new NotificationSenderController({
    send: sendNotification,
    listCampaigns: new ListCampaignsUseCase(notificationRepository),
    getCampaign: new GetCampaignUseCase(notificationRepository),
    deleteCampaign: new DeleteCampaignUseCase(notificationRepository),
  });

  // --- organization preferences ---
  const orgPreferencesRepository =
    new MongooseOrganizationPreferencesRepository();
  const getOrgPreferencesUseCase = new GetOrganizationPreferencesUseCase(
    orgPreferencesRepository,
  );
  const orgPreferencesController = new OrganizationPreferencesController({
    getPreferences: getOrgPreferencesUseCase,
    updatePreferences: new UpdateOrganizationPreferencesUseCase(
      orgPreferencesRepository,
    ),
  });

  // --- public API (rotas /v1/public/*) ---
  // Bearer middleware centralizado — todas as rotas públicas reusam.
  const requireApiKey = makeRequireApiKey({
    repo: apiKeyRepository,
    authSecret: env.AUTH_SECRET,
  });
  const publicClassesController = new PublicClassesController({
    listClasses: new ListPublicClassesUseCase(classRepository, studentRepository),
    createClass: new CreatePublicClassUseCase(
      classRepository,
      courseRepository,
      orgMembersRepository,
    ),
  });
  const publicStudentsController = new PublicStudentsController({
    listStudents: new ListPublicStudentsByClassUseCase(
      classRepository,
      studentRepository,
    ),
    createStudentsBatch: new CreatePublicStudentsBatchUseCase(
      classRepository,
      studentRepository,
      getOrgPreferencesUseCase,
    ),
  });
  const publicExamsController = new PublicExamsController({
    issueExamLink: new IssueExamLinkUseCase(
      examRepository,
      studentRepository,
      classRepository,
      getOrgPreferencesUseCase,
    ),
    getResults: new GetPublicExamResultsUseCase(
      examRepository,
      classRepository,
      studentRepository,
      submissionRepository,
    ),
    webOrigin: env.WEB_ORIGIN,
    authSecret: env.AUTH_SECRET,
  });

  // --- roadmap (público + auth + staff no mesmo router) ---
  const roadmapItemRepository = new MongooseRoadmapItemRepository();
  const roadmapVoteRepository = new MongooseRoadmapVoteRepository();
  const optionalAuth = makeOptionalAuth(auth);
  const roadmapController = new RoadmapController({
    listRoadmap: new ListRoadmapUseCase(
      roadmapItemRepository,
      roadmapVoteRepository,
    ),
    suggestFeature: new SuggestFeatureUseCase(roadmapItemRepository),
    voteOnItem: new VoteOnItemUseCase(
      roadmapItemRepository,
      roadmapVoteRepository,
    ),
    unvoteItem: new UnvoteItemUseCase(
      roadmapItemRepository,
      roadmapVoteRepository,
    ),
  });
  const roadmapStaffController = new RoadmapStaffController({
    createRoadmapItem: new CreateRoadmapItemUseCase(roadmapItemRepository),
    updateRoadmapItem: new UpdateRoadmapItemUseCase(roadmapItemRepository),
    deleteRoadmapItem: new DeleteRoadmapItemUseCase(
      roadmapItemRepository,
      roadmapVoteRepository,
    ),
  });

  // --- assistant (delegação auxiliar→professor) ---
  // Use cases compartilhados entre o controller do /analytics (org admin)
  // e o do Kintal (staff) — só muda quem chama e como o orgId é resolvido.
  const createAssistantUseCase = new CreateAssistantUseCase(
    teacherAssistantsRepository,
    orgMembersRepository,
    auth,
    authDb,
  );
  const listAssistantsForTeacherUseCase = new ListAssistantsForTeacherUseCase(
    teacherAssistantsRepository,
  );
  const revokeAssistantUseCase = new RevokeAssistantUseCase(
    teacherAssistantsRepository,
  );
  const assistantController = new AssistantController({
    listTeachers: new ListTeachersForAssistantUseCase(teacherAssistantsRepository),
    selectTarget: new SelectAssistantTargetUseCase(teacherAssistantsRepository),
    selectSelfTarget: new SelectAssistantSelfTargetUseCase(
      teacherAssistantsRepository,
    ),
    createAssistant: createAssistantUseCase,
    listAssistantsForTeacher: listAssistantsForTeacherUseCase,
    revokeAssistant: revokeAssistantUseCase,
  });
  const kintalAssistantsController = new KintalAssistantsController({
    institutions: kintalInstitutionsRepository,
    createAssistant: createAssistantUseCase,
    listAssistantsForTeacher: listAssistantsForTeacherUseCase,
    revokeAssistant: revokeAssistantUseCase,
  });

  const routers = [
    makeIamRouter(auth, { requireAuth, assistantController, authDb }),
    makeCourseRouter({ requireAuth, controller: courseController }),
    makeClassRouter({ requireAuth, controller: classController }),
    makeStudentRouter({ requireAuth, controller: studentController }),
    makeClassroomRouter({ requireAuth, controller: classroomController }),
    // Callback OAuth do Classroom — público (state assinado), sem raw body,
    // então fica nos routers normais (depois do express.json).
    makeClassroomOAuthRouter({ controller: classroomController }),
    makeExamRouter({ requireAuth, controller: examController }),
    makeAiRouter({
      requireAuth,
      controller: aiController,
      lessonPlanController: lessonPlanAiController,
      slideDeckController: slideDeckAiController,
    }),
    makeLessonPlanRouter({ requireAuth, controller: lessonPlanController }),
    makeSlideDeckRouter({ requireAuth, controller: slideDeckController }),
    makePublicSubmissionRouter({ controller: submissionController }),
    makeAuthedSubmissionRouter({ requireAuth, controller: submissionController }),
    makeScanRouter({ requireAuth, controller: scanController }),
    makeAnalyticsRouter({
      requireAuth,
      requireOrgAdmin,
      controller: analyticsController,
      assistantController,
    }),
    makeApiAccessRouter({
      requireAuth,
      requireOrgAdmin,
      controller: apiAccessController,
    }),
    makeBillingAuthedRouter({ requireAuth, controller: billingController }),
    makeBillingInternalRouter({ controller: billingController }),
    makeInvoicingInternalRouter({ controller: invoicingController }),
    makeInvoicingAuthedRouter({
      requireAuth,
      requireOrgAdmin,
      controller: invoicingController,
    }),
    makeTicketsStaffRouter({
      requireAuth,
      requireStaff,
      controller: ticketsController,
    }),
    makeSupportRouter({ requireAuth, controller: supportController }),
    makeKintalRouter({
      requireAuth,
      requireStaff,
      controller: kintalController,
      staffController: kintalStaffController,
      usersController: kintalUsersController,
      institutionsController: kintalInstitutionsController,
      impersonateController: kintalImpersonateController,
      assistantsController: kintalAssistantsController,
    }),
    makeFinanceRouter({
      requireAuth,
      requireStaff,
      controller: financeController,
    }),
    makeKanbanRouter({
      requireAuth,
      requireStaff,
      controller: kanbanController,
    }),
    makeNotificationReceiverRouter({
      requireAuth,
      controller: notificationReceiverController,
    }),
    ...(() => {
      const senderRouters = makeNotificationSenderRouters({
        requireAuth,
        requireStaff,
        requireOrgAdmin,
        controller: notificationSenderController,
      });
      return [senderRouters.staff, senderRouters.orgAdmin];
    })(),
    makeRoadmapRouter({
      optionalAuth,
      requireAuth,
      requireStaff,
      controller: roadmapController,
      staffController: roadmapStaffController,
    }),
    makeOrganizationPreferencesRouter({
      requireAuth,
      requireOrgAdmin,
      controller: orgPreferencesController,
    }),
    makePublicApiRouter({
      requireApiKey,
      classesController: publicClassesController,
      studentsController: publicStudentsController,
      examsController: publicExamsController,
    }),
  ];

  // Rotas com body bruto — webhook Stripe + NFE.io + Resend Inbound.
  // Precisam vir antes do express.json pra que verificação HMAC tenha
  // o payload exato.
  const rawBodyRouters = [
    makeBillingPublicRouter({ controller: billingController }),
    makeInvoicingPublicRouter({ controller: invoicingController }),
    makeTicketsPublicRouter({ controller: ticketsController }),
  ];

  return createApp({ auth, routers, rawBodyRouters });
}

/**
 * Stub usado quando OMR_SERVICE_URL não está configurado — qualquer tentativa
 * de scan devolve 502 com mensagem amigável.
 */
class UnavailableOmrClient implements OmrServiceClient {
  async process(): Promise<never> {
    throw new OmrServiceError(
      "Serviço OMR não configurado. Defina OMR_SERVICE_URL pra habilitar o scanner.",
    );
  }
}

/**
 * Stub usado quando ABACATEPAY_API_KEY não está configurado. Não é
 * acessível via rota — o controller checa `isAbacatePayConfigured()`
 * antes e devolve 503. Existe só pra satisfazer o tipo do use case sem
 * ramificar a construção condicionalmente.
 */
class UnavailableAbacatePayClient implements AbacatePayClient {
  async createPixQrCode(): Promise<never> {
    throw new Error(
      "AbacatePay não configurado. Defina ABACATEPAY_API_KEY pra habilitar PIX.",
    );
  }
}
