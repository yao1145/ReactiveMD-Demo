import type { NetworkConfig } from 'reactive-md/runtime';
import { httpSubmit, sseStream } from 'reactive-md/runtime/browser';
import { isSurveyAnswer, isSurveyCounts, SURVEY_ANSWERS_PATH, SURVEY_PARTICIPANT_HEADER, SURVEY_RESULTS_PATH } from './survey-contract';

let network: NetworkConfig | undefined;

/** The local service is scoped to the Playground survey example. */
export function getSurveyNetwork(): NetworkConfig | undefined {
  if (!import.meta.env.DEV) return undefined;
  return network ??= {
    channels: {
      answers: { submit: httpSubmit({
        endpoint: SURVEY_ANSWERS_PATH,
        validate: isSurveyAnswer,
        headers: { [SURVEY_PARTICIPANT_HEADER]: crypto.randomUUID().replaceAll('-', '') },
      }) },
      results: { subscribe: sseStream({ endpoint: SURVEY_RESULTS_PATH, validate: isSurveyCounts }) },
    },
  };
}
