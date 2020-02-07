const router = require('express').Router() //eslint-disable-line new-cap
const oboEvents = require('obojobo-express/obo_events')
const db = require('obojobo-express/db')
const AssessmentModel = require('./models/assessment')
const lti = require('obojobo-express/lti')
const logger = require('obojobo-express/logger')
const { startAttempt } = require('./attempt-start')
const resumeAttempt = require('./attempt-resume')
const endAttempt = require('./attempt-end/attempt-end')
const attemptReview = require('./attempt-review')
const insertEvents = require('./attempt-end/insert-events')
const attemptImport = require('./attempt-end/attempt-import')
const { logAndRespondToUnexpected } = require('./util')
const { deletePreviewState } = require('./services/preview')
const {
	requireCurrentDocument,
	requireCurrentVisit,
	requireAttemptId,
	requireCurrentUser,
	requireAssessmentId
} = require('obojobo-express/server/express_validators')

// load the server event listeners
require('./events')

router
	.route('/api/lti/send-assessment-score')
	.post([requireCurrentVisit, requireCurrentUser, requireCurrentDocument, requireAssessmentId])
	.post(async (req, res) => {
		try {
			logger.info(
				`API sendAssessmentScore with userId="${req.currentUser.id}", draftId="${req.currentDocument.draftId}", assessmentId="${req.body.assessmentId}"`
			)
			const ltiScoreResult = await lti.sendHighestAssessmentScore(
				req.currentUser.id,
				req.currentDocument,
				req.body.assessmentId,
				req.currentVisit.is_preview,
				req.currentVisit.resource_link_id
			)

			res.success({
				score: ltiScoreResult.scoreSent,
				status: ltiScoreResult.status,
				statusDetails: ltiScoreResult.statusDetails,
				dbStatus: ltiScoreResult.dbStatus,
				gradebookStatus: ltiScoreResult.gradebookStatus
			})
		} catch (e) {
			logAndRespondToUnexpected('Unexpected error starting a new attempt', res, req, e)
		}
	})

// @TODO: break startAttempt out so it doesn't need req, res
router
	.route('/api/assessments/attempt/start')
	.post([requireCurrentUser, requireCurrentVisit, requireCurrentDocument, requireAssessmentId])
	.post(startAttempt)

router
	.route('/api/assessments/attempt/:attemptId/resume')
	.post([requireCurrentUser, requireCurrentDocument, requireCurrentVisit, requireAttemptId])
	.post(async (req, res) => {
		try {
			const attempt = await resumeAttempt(
				req.currentUser,
				req.currentVisit,
				req.currentDocument,
				req.params.attemptId,
				req.hostname,
				req.connection.remoteAddress
			)

			res.success(attempt)
		} catch (error) {
			logAndRespondToUnexpected('Unexpected error resuming your attempt', res, req, error)
		}
	})

router
	.route('/api/assessments/attempt/:attemptId/end')
	.post([requireCurrentVisit, requireCurrentUser, requireCurrentDocument, requireAttemptId])
	.post((req, res) => {
		return endAttempt(req, res)
			.then(res.success)
			.catch(error =>
				logAndRespondToUnexpected('Unexpected error completing your attempt', res, req, error)
			)
	})

// @TODO make sure i own
// seems like attemptid should be in the url and swithc to get?
router
	.route('/api/assessments/attempt/review')
	.post([requireCurrentUser, requireAttemptId])
	.post(async (req, res) => {
		const questionModels = await attemptReview(req.body.attemptIds)
		res.send(questionModels)
	})

router
	.route('/api/assessments/clear-preview-scores')
	.post([requireCurrentUser, requireCurrentVisit, requireCurrentDocument])
	.post(async (req, res) => {
		if (!req.currentVisit.is_preview) return res.notAuthorized('Not in preview mode')

		return AssessmentModel.deletePreviewAttemptsAndScores(
			req.currentUser.id,
			req.currentDocument.draftId,
			req.currentVisit.resource_link_id
			)
				.then(() => res.success())
				.catch(error => {
					logAndRespondToUnexpected('Unexpected error clearing preview scores', res, req, error)
				})
	})

router
	.route('/api/assessments/:draftId/:assessmentId/import-score')
	.post([requireCurrentUser, requireCurrentDocument, requireCurrentVisit, requireAssessmentId])
	.post((req, res) => {
		return attemptImport(req, res)
			.then(res.success)
			.catch(error => {
				logAndRespondToUnexpected('Error importing score', res, req, error)
			})
	})

router
	.route('/api/assessments/:draftId/attempts')
	.get([requireCurrentUser, requireCurrentVisit, requireCurrentDocument])
	.get((req, res) => {
		return AssessmentModel.fetchAttemptHistory(
			req.currentUser.id,
			req.currentDocument.draftId,
			req.currentVisit.is_preview,
			req.currentVisit.resource_link_id
		)
			.then(res.success)
			.catch(error => {
				logAndRespondToUnexpected('Unexpected error loading attempts', res, req, error)
			})
	})

oboEvents.on('client:question:setResponse', async (event, req) => {
	const eventRecordResponse = 'client:question:setResponse'

	try {
		if (!event.payload.attemptId) return // assume we're in practice
		if (!event.payload.questionId) throw 'Missing Question ID'
		if (!event.payload.response) throw 'Missing Response'

		await db.none(
			`
		INSERT INTO attempts_question_responses
		(attempt_id, question_id, response, assessment_id)
		VALUES($[attemptId], $[questionId], $[response], $[assessmentId])
		ON CONFLICT (attempt_id, question_id) DO
			UPDATE
			SET
				response = $[response],
				updated_at = now()
			WHERE attempts_question_responses.attempt_id = $[attemptId]
				AND attempts_question_responses.question_id = $[questionId]`,
			{
				assessmentId: event.payload.assessmentId,
				attemptId: event.payload.attemptId,
				questionId: event.payload.questionId,
				response: event.payload.response
			}
		)
	} catch (error) {
		logger.error(eventRecordResponse, req, event, error, error.toString())
	}
})

module.exports = router
