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
import { makeOptionalAuth } from "@/domains/iam/presentation/middleware/optional-auth.js";
import { makeIamRouter } from "@/domains/iam/presentation/routes.js";

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

import { MongooseExamRepository } from "@/domains/exam/infrastructure/mongoose-exam-repository.js";
import { DocxExamBuilderImpl } from "@/domains/exam/infrastructure/docx-exam-builder.js";
import { CreateExamUseCase } from "@/domains/exam/application/create-exam.js";
import { ListExamsByClassUseCase } from "@/domains/exam/application/list-exams-by-class.js";
import { GetExamUseCase } from "@/domains/exam/application/get-exam.js";
import { UpdateExamUseCase } from "@/domains/exam/application/update-exam.js";
import { DeleteExamUseCase } from "@/domains/exam/application/delete-exam.js";
import { ExportExamDocxUseCase } from "@/domains/exam/application/export-exam-docx.js";
import { ExamController } from "@/domains/exam/presentation/exam-controller.js";
import { makeExamRouter } from "@/domains/exam/presentation/exam-routes.js";

import { PdfExtractor } from "@/domains/ai-ops/infrastructure/extractors/pdf-extractor.js";
import { DocxExtractor } from "@/domains/ai-ops/infrastructure/extractors/docx-extractor.js";
import { TextExtractor } from "@/domains/ai-ops/infrastructure/extractors/text-extractor.js";
import { YoutubeTranscriptFetcher } from "@/domains/ai-ops/infrastructure/extractors/youtube-transcript-fetcher.js";
import { OpenAiQuestionGenerator } from "@/domains/ai-ops/infrastructure/openai/openai-question-generator.js";
import { GenerateExamQuestionsUseCase } from "@/domains/ai-ops/application/generate-exam-questions.js";
import { RegenerateQuestionUseCase } from "@/domains/ai-ops/application/regenerate-question.js";
import { EstimateExamGenerationUseCase } from "@/domains/ai-ops/application/estimate-exam-generation.js";
import { AiController } from "@/domains/ai-ops/presentation/ai-controller.js";
import { makeAiRouter } from "@/domains/ai-ops/presentation/ai-routes.js";

import { MongooseSubmissionRepository } from "@/domains/submission/infrastructure/mongoose-submission-repository.js";
import { GetPublicExamUseCase } from "@/domains/submission/application/get-public-exam.js";
import { BeginExamUseCase } from "@/domains/submission/application/begin-exam.js";
import { BeginExamFromTokenUseCase } from "@/domains/submission/application/begin-exam-from-token.js";
import { ResolveExamLinkTokenUseCase } from "@/domains/submission/application/resolve-exam-link-token.js";
import { SubmitExamUseCase } from "@/domains/submission/application/submit-exam.js";
import { ListSubmissionsByExamUseCase } from "@/domains/submission/application/list-submissions-by-exam.js";
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
import { SmtpBillingMailer } from "@/domains/billing/infrastructure/smtp-billing-mailer.js";
import { BillingController } from "@/domains/billing/presentation/billing-controller.js";
import {
  makeBillingAuthedRouter,
  makeBillingInternalRouter,
  makeBillingPublicRouter,
} from "@/domains/billing/presentation/billing-routes.js";

import { SmtpSupportMailer } from "@/domains/support/infrastructure/smtp-support-mailer.js";
import { SendContactMessageUseCase } from "@/domains/support/application/send-contact-message.js";
import { SupportController } from "@/domains/support/presentation/support-controller.js";
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
import { GetDashboardMetricsUseCase } from "@/domains/kintal/application/get-dashboard-metrics.js";
import { ListStaffUseCase } from "@/domains/kintal/application/list-staff.js";
import { PromoteToStaffUseCase } from "@/domains/kintal/application/promote-to-staff.js";
import { RevokeStaffUseCase } from "@/domains/kintal/application/revoke-staff.js";
import { ListKintalUsersUseCase } from "@/domains/kintal/application/list-kintal-users.js";
import { GetKintalUserUseCase } from "@/domains/kintal/application/get-kintal-user.js";
import { UpdateKintalUserUseCase } from "@/domains/kintal/application/update-kintal-user.js";
import { AdjustUserCreditsUseCase } from "@/domains/kintal/application/adjust-user-credits.js";
import { KintalController } from "@/domains/kintal/presentation/kintal-controller.js";
import { KintalStaffController } from "@/domains/kintal/presentation/kintal-staff-controller.js";
import { KintalUsersController } from "@/domains/kintal/presentation/kintal-users-controller.js";
import { makeKintalRouter } from "@/domains/kintal/presentation/kintal-routes.js";
import { makeRequireStaff } from "@/domains/kintal/presentation/require-staff.js";

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
  const requireAuth = makeRequireAuth(auth, {
    orgMembersRepository,
    authSecret: env.AUTH_SECRET,
  });

  // --- repositories ---
  const classRepository = new MongooseClassRepository();
  const studentRepository = new MongooseStudentRepository();
  const examRepository = new MongooseExamRepository();
  const submissionRepository = new MongooseSubmissionRepository();

  // --- class domain ---
  const classController = new ClassController({
    createClass: new CreateClassUseCase(classRepository),
    listClasses: new ListClassesUseCase(classRepository, studentRepository, examRepository),
    getClass: new GetClassUseCase(classRepository, studentRepository, examRepository),
    updateClass: new UpdateClassUseCase(classRepository),
    deleteClass: new DeleteClassUseCase(classRepository, studentRepository, examRepository),
  });

  // --- student domain ---
  const studentController = new StudentController({
    createStudent: new CreateStudentUseCase(studentRepository, classRepository),
    listStudentsByClass: new ListStudentsByClassUseCase(studentRepository, classRepository),
    updateStudent: new UpdateStudentUseCase(studentRepository),
    deleteStudent: new DeleteStudentUseCase(studentRepository),
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
  });

  // --- ai-ops domain ---
  const extractors = [new PdfExtractor(), new DocxExtractor(), new TextExtractor()];
  const transcriptFetcher = new YoutubeTranscriptFetcher();
  const questionGenerator = new OpenAiQuestionGenerator();
  const aiController = new AiController({
    generateExamQuestions: new GenerateExamQuestionsUseCase(
      extractors,
      transcriptFetcher,
      questionGenerator,
      billingService,
    ),
    regenerateQuestion: new RegenerateQuestionUseCase(
      extractors,
      transcriptFetcher,
      questionGenerator,
      billingService,
    ),
    estimateExamGeneration: new EstimateExamGenerationUseCase(
      extractors,
      transcriptFetcher,
    ),
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
    beginExam: new BeginExamUseCase(
      examRepository,
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
      ledgerRepository,
    ),
    exportTeacherData: new ExportTeacherDataUseCase(
      orgMembersRepository,
      classRepository,
      examRepository,
    ),
    orgMembersRepository,
    orgInvitationsRepository,
    orgBillingSettingsRepository: orgBillingSettingsRepo,
  });

  // --- billing controller (precisa do auth pra recuperar email do user no
  // checkout; por isso fica aqui embaixo) ---
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
      mailer: new SmtpBillingMailer(),
    }),
    expireStaleWallets: new ExpireStaleWalletsUseCase(
      walletRepository,
      ledgerRepository,
    ),
    auth,
  });

  // --- support domain ---
  const supportController = new SupportController(
    new SendContactMessageUseCase(new SmtpSupportMailer()),
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
  const requireStaff = makeRequireStaff();

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

  const routers = [
    makeIamRouter(auth),
    makeClassRouter({ requireAuth, controller: classController }),
    makeStudentRouter({ requireAuth, controller: studentController }),
    makeExamRouter({ requireAuth, controller: examController }),
    makeAiRouter({ requireAuth, controller: aiController }),
    makePublicSubmissionRouter({ controller: submissionController }),
    makeAuthedSubmissionRouter({ requireAuth, controller: submissionController }),
    makeScanRouter({ requireAuth, controller: scanController }),
    makeAnalyticsRouter({
      requireAuth,
      requireOrgAdmin,
      controller: analyticsController,
    }),
    makeApiAccessRouter({
      requireAuth,
      requireOrgAdmin,
      controller: apiAccessController,
    }),
    makeBillingAuthedRouter({ requireAuth, controller: billingController }),
    makeBillingInternalRouter({ controller: billingController }),
    makeSupportRouter({ requireAuth, controller: supportController }),
    makeKintalRouter({
      requireAuth,
      requireStaff,
      controller: kintalController,
      staffController: kintalStaffController,
      usersController: kintalUsersController,
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

  // Rotas com body bruto — webhook Stripe. Precisam vir antes do express.json.
  const rawBodyRouters = [
    makeBillingPublicRouter({ controller: billingController }),
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
