import type { ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  isSurveyAnswer, SURVEY_ANSWERS_PATH, SURVEY_PARTICIPANT_HEADER, SURVEY_RESULTS_PATH, type SurveyAnswer, type SurveyCounts,
} from './src/network/survey-contract.ts';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_VOTES = 1024;
const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

interface RecordedVote {
  readonly answer: SurveyAnswer;
  readonly result: { readonly ok: true; readonly counts: SurveyCounts };
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

/** Local-only HTTP and SSE endpoints for the Playground survey. */
export function surveyApi(): Plugin {
  return {
    name: 'reactive-md-demo-survey',
    apply: 'serve',
    configureServer(server) {
      const counts = { yes: 0, no: 0 };
      const votes = new Map<string, RecordedVote>();
      const streams = new Set<ServerResponse>();
      const sendSnapshot = (response: ServerResponse): void => {
        response.write(`data: ${JSON.stringify(counts)}\n\n`);
      };
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== SURVEY_ANSWERS_PATH && request.url !== SURVEY_RESULTS_PATH) return next();
        const fail = (status: number, error: string): void => json(response, status, { error });
        if (!LOOPBACK.includes(request.socket.remoteAddress ?? '')) {
          fail(403, 'Open the local Demo to use the survey.');
          return;
        }
        if (request.url === SURVEY_RESULTS_PATH) {
          if (request.method !== 'GET') return fail(405, 'Use GET to subscribe.');
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
          });
          sendSnapshot(response);
          streams.add(response);
          // Refresh so a listener joining an existing stream receives a snapshot.
          const timer = setInterval(() => sendSnapshot(response), 5_000);
          response.once('close', () => {
            clearInterval(timer);
            streams.delete(response);
          });
          return;
        }

        if (request.method !== 'POST') return fail(405, 'Use POST to submit an answer.');
        if (request.headers.origin !== `http://${request.headers.host}`) {
          return fail(403, 'Submit from the local Demo.');
        }
        const participant = request.headers[SURVEY_PARTICIPANT_HEADER.toLowerCase()];
        const key = request.headers['idempotency-key'];
        if (typeof participant !== 'string' || !/^[a-f0-9]{32}$/.test(participant)
          || typeof key !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(key)) {
          return fail(400, 'Send a valid participant identifier and idempotency key.');
        }
        let answer: unknown;
        try {
          const chunks: Buffer[] = [];
          let bytes = 0;
          for await (const chunk of request.iterator({ destroyOnReturn: false })) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bytes += buffer.byteLength;
            if (bytes > MAX_BODY_BYTES) {
              request.resume();
              return fail(413, 'The answer exceeds the request size limit.');
            }
            chunks.push(buffer);
          }
          answer = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          if (!response.destroyed) fail(400, 'Send a JSON answer.');
          return;
        }
        if (!isSurveyAnswer(answer)) return fail(422, 'Send a valid choice and comment.');

        // The operation is fixed by this route. Commit the vote and its result
        // before publishing or replying, in the same turn of the event loop.
        const voteKey = JSON.stringify([participant, key]);
        const previous = votes.get(voteKey);
        if (previous) {
          if (previous.answer.choice !== answer.choice || previous.answer.comment !== answer.comment) {
            return fail(409, 'This idempotency key already belongs to a different answer.');
          }
          return json(response, 200, previous.result);
        }
        if (votes.size >= MAX_VOTES) return fail(429, 'The local survey has reached its vote limit.');
        counts[answer.choice] += 1;
        const result = { ok: true as const, counts: { ...counts } };
        votes.set(voteKey, { answer, result });
        for (const stream of streams) sendSnapshot(stream);
        json(response, 200, result);
      });
    },
  };
}
