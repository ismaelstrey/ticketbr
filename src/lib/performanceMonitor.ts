interface Metric {
  name: string;
  value: number;
  timestamp: number;
}

interface APIMetric extends Metric {
  url: string;
  success: boolean;
  cached: boolean;
}

class PerformanceMonitor {
  private apiMetrics: APIMetric[] = [];
  private renderMetrics: Metric[] = [];

  // Config thresholds
  private RESPONSE_TIME_THRESHOLD = 500; // 500ms
  private ERROR_RATE_THRESHOLD = 0.01; // 1%

  public trackAPICall(url: string, duration: number, success: boolean, cached: boolean = false) {
    this.apiMetrics.push({
      name: "api_call",
      url,
      value: duration,
      success,
      cached,
      timestamp: Date.now()
    });

    // Truncate to keep memory bounded
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics = this.apiMetrics.slice(-500);
    }

    this.analyzeAPI();
  }

  public trackRender(component: string, duration: number) {
    this.renderMetrics.push({
      name: `render_${component}`,
      value: duration,
      timestamp: Date.now()
    });

    if (this.renderMetrics.length > 1000) {
      this.renderMetrics = this.renderMetrics.slice(-500);
    }
  }

  private shouldEmitAlerts() {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem("ticketbr-perf-alerts") === "1";
      } catch {
        return false;
      }
    }

    return process.env.NODE_ENV === "production";
  }

  private analyzeAPI() {
    const recentMetrics = this.apiMetrics.slice(-100); // Analyze last 100 calls
    if (recentMetrics.length === 0) return;

    let errors = 0;
    let totalDuration = 0;
    let slowCalls = 0;

    recentMetrics.forEach(m => {
      if (!m.success) errors++;
      totalDuration += m.value;
      if (m.value > this.RESPONSE_TIME_THRESHOLD) slowCalls++;
    });

    const errorRate = errors / recentMetrics.length;
    const avgDuration = totalDuration / recentMetrics.length;

    if (!this.shouldEmitAlerts()) {
      return;
    }

    if (errorRate > this.ERROR_RATE_THRESHOLD) {
      console.error(`[Alert] API Error rate is high: ${(errorRate * 100).toFixed(2)}%`);
    }

    if (avgDuration > this.RESPONSE_TIME_THRESHOLD) {
      console.warn(`[Alert] Average API Response Time is high: ${avgDuration.toFixed(2)}ms`);
    }
  }

  public getStats() {
    const hits = this.apiMetrics.filter(m => m.cached).length;
    const cacheHitRate = this.apiMetrics.length > 0 ? hits / this.apiMetrics.length : 0;
    
    const mem = (performance as any).memory;
    const memoryUsage = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) + "MB" : "N/A";

    return {
      apiCalls: this.apiMetrics.length,
      cacheHitRate: `${(cacheHitRate * 100).toFixed(2)}%`,
      memoryUsage
    };
  }
}

export const perfMonitor = new PerformanceMonitor();
