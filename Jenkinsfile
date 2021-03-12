#!groovy

node {
  def err = null

  try {
    def project_dir = 'opensphere-plugin-analyze'
    def workspace_project = 'opensphere-yarn-workspace'
    def workspace_dir = "${workspace_project}/workspace"

    stage('init') {
      initEnvironment()
    }

    docker.withRegistry(env.DOCKER_REGISTRY, env.DOCKER_CREDENTIAL) {
      def dockerImage = docker.image(env.DOCKER_IMAGE)
      dockerImage.pull()

      //
      // - Disable user namespace for the container so permissions will map properly with the host
      // - Set HOME to the workspace for .yarn and .cache cache directories
      //
      dockerImage.inside("--userns=host -e HOME=${env.WORKSPACE}") {
        stage('scm') {
          sh "rm -rf ${workspace_project}"

          try {
            beforeCheckout()
          } catch (NoSuchMethodError e) {
          }

          cloneProject(workspace_project)

          dir(workspace_dir) {
            def projects = [
              'opensphere',
              'bits-internal',
              'mist',
              'opensphere-nga-brand',
              project_dir
            ]

            for (def project in projects) {
              cloneProject(project)
            }
          }
        }

        stage('yarn') {
          dir(workspace_project) {
            sh 'yarn config list'
            sh "rm yarn.lock || true"
            sh "yarn"
          }
        }

        stage('build') {
          dir("${workspace_dir}/${project_dir}") {
            sh 'yarn lint'
          }
        }
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
