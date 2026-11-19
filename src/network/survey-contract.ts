export const SURVEY_EXAMPLE_ID = 'network-survey';
export const SURVEY_ANSWERS_PATH = '/__reactive-md/survey/answers';
export const SURVEY_RESULTS_PATH = '/__reactive-md/survey/results';
export const SURVEY_PARTICIPANT_HEADER = 'X-Survey-Participant';

export interface SurveyAnswer {
  readonly choice: 'yes' | 'no';
  readonly comment: string;
}

export interface SurveyCounts {
  readonly yes: number;
  readonly no: number;
}

export function isSurveyAnswer(value: unknown): value is SurveyAnswer {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length !== 2) {
    return false;
  }
  const { choice, comment } = value as Partial<SurveyAnswer>;
  return (choice === 'yes' || choice === 'no') && typeof comment === 'string' && comment.length <= 2000;
}

export function isSurveyCounts(value: unknown): value is SurveyCounts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { yes, no } = value as Partial<SurveyCounts>;
  return typeof yes === 'number' && Number.isSafeInteger(yes) && yes >= 0
    && typeof no === 'number' && Number.isSafeInteger(no) && no >= 0;
}
