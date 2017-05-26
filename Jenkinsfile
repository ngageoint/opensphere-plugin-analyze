#!groovy

node() {
  // kick off GEOINT Viewer build
  build job: "uncanny-cougar/opensphere-plugin-geoint-viewer/opensphere-plugin-geoint-viewer/${env.BRANCH_NAME}", quietPeriod: 5, wait: false
}
