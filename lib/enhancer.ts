export interface CreateNotificationEnhancerArgs {
  onRender: (renderPromise: Promise<void>) => void
  throttle: boolean
}

export const createNotificationEnhancer = ({
  onRender,
  throttle,
}: CreateNotificationEnhancerArgs) => {
  console.log({onRender, throttle})
}
