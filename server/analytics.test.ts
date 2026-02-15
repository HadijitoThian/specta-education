import { describe, it, expect } from "vitest";
import {
  getAnalyticsKPIs,
  getLeadsOverTime,
  getApplicationPipeline,
  getRevenueOverTime,
  getLeadsBySource,
  getTopCountries,
  getCounselorPerformance,
  getScholarshipLeadsOverTime,
} from "./db";

describe("Analytics Dashboard Backend", () => {
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const range = { startDate: oneMonthAgo, endDate: now };

  it("getAnalyticsKPIs returns all expected fields", async () => {
    const kpis = await getAnalyticsKPIs(range);
    expect(kpis).toBeDefined();
    expect(typeof kpis.totalLeads).toBe("number");
    expect(typeof kpis.totalLeadsPrev).toBe("number");
    expect(typeof kpis.totalApplications).toBe("number");
    expect(typeof kpis.totalApplicationsPrev).toBe("number");
    expect(typeof kpis.totalAppointments).toBe("number");
    expect(typeof kpis.totalAppointmentsPrev).toBe("number");
    expect(typeof kpis.totalProRevenue).toBe("number");
    expect(typeof kpis.totalProRevenuePrev).toBe("number");
    expect(typeof kpis.totalIeltsTests).toBe("number");
    expect(typeof kpis.totalIeltsTestsPrev).toBe("number");
    expect(typeof kpis.totalAptitudeTests).toBe("number");
    expect(typeof kpis.totalAptitudeTestsPrev).toBe("number");
    expect(typeof kpis.conversionRate).toBe("number");
    expect(typeof kpis.enrolledCount).toBe("number");
    expect(kpis.conversionRate).toBeGreaterThanOrEqual(0);
    expect(kpis.conversionRate).toBeLessThanOrEqual(100);
  });

  it("getLeadsOverTime returns array with date and count", async () => {
    const data = await getLeadsOverTime(range);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("getApplicationPipeline returns array with status and count", async () => {
    const data = await getApplicationPipeline();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("status");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("getRevenueOverTime returns array with date and total", async () => {
    const data = await getRevenueOverTime(range);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("total");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("getLeadsBySource returns array with source and count", async () => {
    const data = await getLeadsBySource(range);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("source");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("getTopCountries returns array with country and count", async () => {
    const data = await getTopCountries(range);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("country");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("getCounselorPerformance returns array with counselor details", { timeout: 30000 }, async () => {
    const data = await getCounselorPerformance();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("specialization");
      expect(data[0]).toHaveProperty("leadsAssigned");
      expect(data[0]).toHaveProperty("applicationsManaged");
      expect(data[0]).toHaveProperty("enrolled");
      expect(data[0]).toHaveProperty("enrollmentRate");
    }
  });

  it("getScholarshipLeadsOverTime returns array with date and count", async () => {
    const data = await getScholarshipLeadsOverTime(range);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("count");
    }
  });

  it("KPI values are non-negative", async () => {
    const kpis = await getAnalyticsKPIs(range);
    expect(kpis.totalLeads).toBeGreaterThanOrEqual(0);
    expect(kpis.totalApplications).toBeGreaterThanOrEqual(0);
    expect(kpis.totalAppointments).toBeGreaterThanOrEqual(0);
    expect(kpis.totalProRevenue).toBeGreaterThanOrEqual(0);
    expect(kpis.totalIeltsTests).toBeGreaterThanOrEqual(0);
    expect(kpis.totalAptitudeTests).toBeGreaterThanOrEqual(0);
  });

  it("getAnalyticsKPIs works with 'all time' range", async () => {
    const allTimeRange = { startDate: new Date(2020, 0, 1), endDate: now };
    const kpis = await getAnalyticsKPIs(allTimeRange);
    expect(kpis).toBeDefined();
    expect(typeof kpis.totalLeads).toBe("number");
  });
});
