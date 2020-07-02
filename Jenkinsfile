#!groovy

node() {
  // kick off OpenSphere build
  build job: "uncanny-cougar/opensphere-plugin-geoint-viewer/opensphere-plugin-geoint-viewer/${env.BRANCH_NAME}", quietPeriod: 5, wait: false
}
