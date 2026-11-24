import { StatusBar, StatusHint, StatusName, StatusSeparator } from '@lembaran/ui';
import { scaleLabel, slideLabel } from '../../feature/view';

interface Props {
  name: string;
  index: number;
  slides: number;
  scale: number;
}

export function SlideStatus({ name, index, slides, scale }: Props) {
  return (
    <StatusBar>
      <StatusName title={name}>{name}</StatusName>
      <StatusSeparator />
      <span>{slides === 1 ? '1 slide' : `${slides} slides`}</span>
      <StatusSeparator />
      <span>{slideLabel(index, slides)}</span>
      <StatusSeparator />
      <span>{scaleLabel(scale)}</span>
      <StatusHint>← → slides · + − zoom · 0 fit · F full screen</StatusHint>
    </StatusBar>
  );
}
