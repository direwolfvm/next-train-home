import { TrainPrediction, DirectionConfig } from './types'

export function filterDirection(
  trains: TrainPrediction[],
  dir: DirectionConfig,
): TrainPrediction[] {
  return trains.filter(t =>
    t.Group === dir.group &&
    (dir.lines as string[]).includes(t.Line) &&
    t.DestinationName !== 'No Passenger' &&
    t.Line !== 'No' &&
    t.Line !== ''
  )
}
