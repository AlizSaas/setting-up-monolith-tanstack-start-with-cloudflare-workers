import { queryOptions } from "@tanstack/react-query"
import { getSettingsFn } from "./setting"

export const SETTINGS_QUERY_KEY = {

  settingsInvalidation: ['settings'],
}

export const settingsQueryOptions = () => {
  return queryOptions({
    queryKey: SETTINGS_QUERY_KEY.settingsInvalidation,
    queryFn: () => getSettingsFn()
  })
}