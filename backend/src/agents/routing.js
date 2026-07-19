const routingMap = {
  pothole: 'municipal-roads',
  waterlogging: 'drainage-dept',
  accident: 'traffic-police',
  signal_failure: 'traffic-police',
  blocked_road: 'municipal-roads',
  unclassified: 'municipal-roads',
};

function routeDepartment(issue_type) {
  return routingMap[issue_type] || 'municipal-roads';
}

module.exports = { routeDepartment };
