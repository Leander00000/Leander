export default function DashboardLoading() {
  return (
    <div className="page-wrap" aria-label="Loading dashboard">
      <div className="skeleton skeleton-heading" />
      <div className="today-grid">
        <div className="today-main-column">
          <div className="dashboard-card skeleton-card" />
          <div className="dashboard-card skeleton-card short" />
        </div>
        <aside className="today-side-column">
          <div className="dashboard-card skeleton-card short" />
          <div className="dashboard-card skeleton-card short" />
        </aside>
      </div>
    </div>
  );
}
