export interface ApiResponse {
	psa: string | null
	sale: string | null
	time: number
	services: [string, 0 | 1 | 2, string][]
	c_cms: ChartData
	c_pv: ChartData
}

export interface ChartData {
	start: number
	step: number
	data: number[]
}

export interface ChartDefinition {
	canvas: HTMLCanvasElement
	status: HTMLElement
	statusHover: HTMLElement
	hoveredIndex: number
	graph: ChartData | null
}