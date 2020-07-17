#!groovy

node('Linux&&!gpu') {
  try {
    def project_dir = 'opensphere-plugin-analyze'

    initEnvironment()
    initGV()

    try {
      beforeCheckout()
    } catch (NoSuchMethodError e) {
    }

    stage('scm') {
      installPlugins('opensphere-yarn-workspace')

      dir('workspace') {
        sh 'rm -rf *'
        dir(project_dir) {
          sh "echo 'checking out scm'"
          checkout scm

          GIT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

          try {
            this_version = sh(script: 'git describe --exact-match HEAD', returnStdout: true).trim()
          } catch (e) {
            this_version = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
          }
          sh "echo Building: ${this_version}"
        }

        def projects = [
          'opensphere',
          'bits-internal',
          'mist'
        ]

        for (def project in projects) {
          dir(project) {
            installPlugins(project)
          }
        }
      }
    }

    stage('yarn') {
      sh 'npm i -g yarn'
      sh 'yarn config list'
      sh 'rm yarn.lock || true'
      sh "yarn install"
    }

    stage('build') {
      dir("workspace/${project_dir}") {
        sh 'yarn run lint'
        // sh 'yarn run test'
      }
    }
  } catch (e) {
    currentBuild.result = 'FAILURE'
    err = e
  } finally {
    try {
      notifyBuild()
    } catch (NoSuchMethodError e) {
      error 'Please define "notifyBuild()" through a shared pipeline library for this network'
    }

    if (err) {
      throw err
    }
  }
}
