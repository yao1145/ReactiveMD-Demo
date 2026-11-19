import { useEffect, useState } from 'react';
import { defineReactComponentPackage, type LocalComponentContext } from 'reactive-md/react';
import { isSurveyCounts, type SurveyCounts } from '../../src/network/survey-contract';

function SurveyTally({ locale, props, services, visible, mode }: LocalComponentContext) {
  const { t } = locale;
  const network = services.network;
  const active = mode === 'interactive' && visible && network?.supports('results', 'subscribe');
  const [counts, setCounts] = useState<SurveyCounts>();
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    setCounts(undefined);
    setProblem(false);
    if (!active || !network) return;
    return network.subscribe('results', event => {
      if (event.type === 'data' && isSurveyCounts(event.value)) {
        const value = event.value;
        setCounts(current => current?.yes === value.yes && current.no === value.no ? current : value);
        setProblem(false);
      }
      if (event.type === 'error') setProblem(true);
    });
  }, [active, network]);

  const title = String(props.label ?? t('Live results', '实时统计'));
  return (
    <section className="md-panel" data-survey-tally hidden={!visible || undefined}>
      <h3 className="md-panel-title">{title}</h3>
      <output>
        {!active ? t('Live results are available in the local Demo.', '在本地 Demo 查看实时统计。')
          : problem ? t('Waiting for the results stream.', '正在等待统计流。')
          : counts ? t(`Yes ${counts.yes} · No ${counts.no}`, `参加 ${counts.yes} · 不参加 ${counts.no}`)
          : t('Connecting…', '正在连接…')}
      </output>
    </section>
  );
}

export default defineReactComponentPackage({
  id: 'reactive-md-demo/survey-tally',
  name: 'survey-tally',
  version: '1.0.0',
  props: { label: { kind: 'string' } },
  capabilities: { interactive: true, static: true, ssr: true, offline: true },
  render: SurveyTally,
});
