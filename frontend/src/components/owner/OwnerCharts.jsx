import React, { useState } from 'react'
import './OwnerCharts.css'

/**
 * Rent Collection Trend Chart
 * Grouped SVG Bar Chart comparing Expected vs Collected monthly rent
 */
export function RentCollectionTrendChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const maxRent = 500000 // ₹5,00,000 top ceiling
  const chartHeight = 160
  const chartWidth = 460
  const barWidth = 18

  return (
    <div className="trend-chart-card">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-title">Rent Collection Trend</h3>
          <p className="chart-subtitle">Monthly Expected vs. Collected Rent (Last 6 Months)</p>
        </div>
        <div className="chart-legend-row">
          <span className="legend-item">
            <span className="legend-box expected-box"></span>
            Expected
          </span>
          <span className="legend-item">
            <span className="legend-box collected-box"></span>
            Collected
          </span>
        </div>
      </div>

      <div className="trend-svg-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          className="trend-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Grid Lines */}
          {[0, 100000, 200000, 300000, 400000, 500000].map((val) => {
            const y = chartHeight - (val / maxRent) * chartHeight + 10
            return (
              <g key={val}>
                <line
                  x1="35"
                  y1={y}
                  x2={chartWidth - 10}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray={val === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text x="30" y={y + 3} textAnchor="end" className="chart-axis-text">
                  ₹{val / 1000}k
                </text>
              </g>
            )
          })}

          {/* Bar Groups */}
          {data.map((item, index) => {
            const x = 50 + index * 68
            const expectedHeight = (item.expected / maxRent) * chartHeight
            const collectedHeight = (item.collected / maxRent) * chartHeight
            const expectedY = chartHeight - expectedHeight + 10
            const collectedY = chartHeight - collectedHeight + 10
            const isHovered = hoveredIdx === index

            return (
              <g
                key={item.month}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Expected Bar */}
                <rect
                  x={x}
                  y={expectedY}
                  width={barWidth}
                  height={expectedHeight}
                  rx="4"
                  className="bar-expected"
                />
                {/* Collected Bar */}
                <rect
                  x={x + barWidth + 3}
                  y={collectedY}
                  width={barWidth}
                  height={collectedHeight}
                  rx="4"
                  className="bar-collected"
                />
                {/* Month Label */}
                <text
                  x={x + barWidth + 1}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  className={`chart-label-text ${isHovered ? 'active' : ''}`}
                >
                  {item.month}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredIdx !== null && (
          <div className="chart-tooltip-badge">
            <strong>{data[hoveredIdx].month}</strong>: Collected ₹
            {data[hoveredIdx].collected.toLocaleString('en-IN')} of ₹
            {data[hoveredIdx].expected.toLocaleString('en-IN')} (
            {Math.round((data[hoveredIdx].collected / data[hoveredIdx].expected) * 100)}%)
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Occupancy Donut Chart
 * SVG Circular representation of 48 Occupied, 8 Available, 2 Reserved, 2 Maintenance
 */
export function OccupancyDonutChart({ data }) {
  // Total 60 beds. Radius: 50. Circumference = 2 * PI * 50 = 314.16
  const radius = 50
  const circumference = 2 * Math.PI * radius

  const occupiedStroke = (data.occupied / data.total) * circumference
  const availableStroke = (data.available / data.total) * circumference
  const reservedStroke = (data.reserved / data.total) * circumference
  const maintenanceStroke = (data.maintenance / data.total) * circumference

  // Offsets
  const offsetOccupied = 0
  const offsetAvailable = -occupiedStroke
  const offsetReserved = -(occupiedStroke + availableStroke)
  const offsetMaintenance = -(occupiedStroke + availableStroke + reservedStroke)

  return (
    <div className="occupancy-chart-card">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-title">Occupancy Overview</h3>
          <p className="chart-subtitle">Live Capacity: {data.total} Total Beds</p>
        </div>
        <span className="occupancy-rate-pill">{data.occupiedPct}% Occupied</span>
      </div>

      <div className="donut-layout-row">
        {/* SVG Donut */}
        <div className="donut-svg-container">
          <svg viewBox="0 0 140 140" className="donut-svg">
            <g transform="rotate(-90 70 70)">
              {/* Background ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="16"
              />
              {/* Occupied Slice (Navy / Slate) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#0f172a"
                strokeWidth="16"
                strokeDasharray={`${occupiedStroke} ${circumference}`}
                strokeDashoffset={offsetOccupied}
              />
              {/* Available Slice (Green) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#16a34a"
                strokeWidth="16"
                strokeDasharray={`${availableStroke} ${circumference}`}
                strokeDashoffset={offsetAvailable}
              />
              {/* Reserved Slice (Blue) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="16"
                strokeDasharray={`${reservedStroke} ${circumference}`}
                strokeDashoffset={offsetReserved}
              />
              {/* Maintenance Slice (Orange/Amber) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeDasharray={`${maintenanceStroke} ${circumference}`}
                strokeDashoffset={offsetMaintenance}
              />
            </g>
          </svg>
          <div className="donut-center-info">
            <span className="donut-center-pct">{data.occupied}</span>
            <span className="donut-center-label">Occupied</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="donut-legend-col">
          <div className="donut-legend-row">
            <span className="legend-indicator dot-occupied"></span>
            <span className="legend-name">Occupied:</span>
            <strong className="legend-val">{data.occupied} Beds</strong>
            <span className="legend-pct">({data.occupiedPct}%)</span>
          </div>
          <div className="donut-legend-row">
            <span className="legend-indicator dot-available"></span>
            <span className="legend-name">Available:</span>
            <strong className="legend-val">{data.available} Beds</strong>
            <span className="legend-pct">({data.availablePct.toFixed(1)}%)</span>
          </div>
          <div className="donut-legend-row">
            <span className="legend-indicator dot-reserved"></span>
            <span className="legend-name">Reserved:</span>
            <strong className="legend-val">{data.reserved} Beds</strong>
            <span className="legend-pct">({data.reservedPct.toFixed(1)}%)</span>
          </div>
          <div className="donut-legend-row">
            <span className="legend-indicator dot-maintenance"></span>
            <span className="legend-name">Maintenance:</span>
            <strong className="legend-val">{data.maintenance} Beds</strong>
            <span className="legend-pct">({data.maintenancePct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Monthly Rent Overview Breakdown Component
 */
export function MonthlyRentOverviewCard({ data }) {
  return (
    <div className="rent-overview-card">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-title">Monthly Rent Overview</h3>
          <p className="chart-subtitle">September 2026 Collection Cycle</p>
        </div>
        <span className="rent-pct-tag">{data.collectionRate}% Collected</span>
      </div>

      <div className="rent-primary-figures">
        <div className="figure-block expected">
          <span className="figure-label">Expected Rent</span>
          <span className="figure-amount">₹{data.expected.toLocaleString('en-IN')}</span>
        </div>
        <div className="figure-block collected">
          <span className="figure-label">Collected so far</span>
          <span className="figure-amount">₹{data.collected.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Multi-segment progress bar */}
      <div className="rent-progress-bar-wrapper">
        <div
          className="rent-progress-segment seg-collected"
          style={{ width: `${(data.collected / data.expected) * 100}%` }}
          title={`Collected: ₹${data.collected.toLocaleString('en-IN')}`}
        ></div>
        <div
          className="rent-progress-segment seg-pending"
          style={{ width: `${(data.pending / data.expected) * 100}%` }}
          title={`Pending: ₹${data.pending.toLocaleString('en-IN')}`}
        ></div>
        <div
          className="rent-progress-segment seg-overdue"
          style={{ width: `${(data.overdue / data.expected) * 100}%` }}
          title={`Overdue: ₹${data.overdue.toLocaleString('en-IN')}`}
        ></div>
      </div>

      {/* Bottom Breakdown Tiles */}
      <div className="rent-status-tiles">
        <div className="status-tile">
          <span className="tile-dot dot-collected"></span>
          <div>
            <span className="tile-label">Collected</span>
            <strong className="tile-amount">₹{data.collected.toLocaleString('en-IN')}</strong>
          </div>
        </div>
        <div className="status-tile">
          <span className="tile-dot dot-pending"></span>
          <div>
            <span className="tile-label">Pending</span>
            <strong className="tile-amount">₹{data.pending.toLocaleString('en-IN')}</strong>
          </div>
        </div>
        <div className="status-tile">
          <span className="tile-dot dot-overdue"></span>
          <div>
            <span className="tile-label">Overdue</span>
            <strong className="tile-amount text-danger">₹{data.overdue.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
