import { queryOptions } from "@tanstack/react-query"
import { getDashboardStatsFn } from "./dashboard"
export const DASHBOARD_QUERY_KEY = {
    dashboardStats: ['dashboardStats'],
    dashboardChartsStats: ['dashboardChartsStats'],
}

export const dashboardStatsQueryOptions = () => {
    return queryOptions({
        queryKey: DASHBOARD_QUERY_KEY.dashboardStats,
        queryFn: () => getDashboardStatsFn({}),
    })

}

export const dashboardChartsStatsQueryOptions = () => {
    return queryOptions({
        queryKey: DASHBOARD_QUERY_KEY.dashboardChartsStats,
        queryFn: () => getDashboardStatsFn({}),
    })
}