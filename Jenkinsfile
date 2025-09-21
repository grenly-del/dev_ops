pipeline {
    agent any
    stages {
        stage("Clone Project") {
            steps {
                git branch : 'main',
                url : 'https://github.com/grenly-del/dev_ops.git',

            }
        }

        stage("Install Depedencies") {
            steps {
                sh "npm install"
            }
        }

        stage("Run the Project") {
            steps {
                sh "node ."
            }
        }
    }   
}