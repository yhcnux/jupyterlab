#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

set -ex
set -o pipefail

if [[ $GROUP != nonode ]]; then
    python -c "from jupyterlab.commands import build_check; build_check()"
fi


if [[ $GROUP == python ]]; then
    # Run the python tests
    py.test -v --junitxml=junit.xml
fi


if [[ $GROUP == js ]]; then

    jlpm build:packages
    jlpm build:test
    FORCE_COLOR=1 jlpm coverage --loglevel success

    jlpm run clean
fi


if [[ $GROUP == docs ]]; then

    # Run the link check - allow for a link to fail once
    py.test --check-links -k .md . || py.test --check-links -k .md --lf .

    # Build the docs
    jlpm build:packages
    jlpm docs

    # Verify tutorial docs build
    pushd docs
    pip install sphinx sphinx-copybutton sphinx_rtd_theme recommonmark
    make linkcheck
    make html
    popd
fi


if [[ $GROUP == integrity ]]; then
    # Run the integrity script first
    jlpm run integrity --force

    # Check yarn.lock file
    jlpm check --integrity

    # Lint our files.
    jlpm run lint:check || (echo 'Please run `jlpm run lint` locally and push changes' && exit 1)

    # Build the packages individually.
    jlpm run build:src

    # Make sure we have CSS that can be converted with postcss
    jlpm global add postcss-cli

    jlpm config set prefix ~/.yarn
    ~/.yarn/bin/postcss packages/**/style/*.css --dir /tmp

    # run twine check on the python build assets.
    # this must be done before altering any versions below.
    python -m pip install -U twine wheel
    python setup.py sdist
    python setup.py bdist_wheel
    twine check dist/*

    # Make sure we can bump the version
    # This must be done at the end so as not to interfere
    # with the other checks
    git config --global user.email "you@example.com"
    git config --global user.name "CI"
    git stash
    git checkout -b commit_${BUILD_SOURCEVERSION}
    git clean -df
    jlpm bumpversion minor --force
    jlpm bumpversion major --force
    jlpm bumpversion release --force # switch to beta
    jlpm bumpversion release --force # switch to rc
    jlpm bumpversion build --force
    VERSION=$(python setup.py --version)
    if [[ $VERSION != *rc1 ]]; then exit 1; fi

    # make sure we can patch release
    jlpm bumpversion release --force  # switch to final
    jlpm patch:release --force

    # make sure we can bump major JS releases
    jlpm bumpversion minor --force
    jlpm bump:js:major console --force
    jlpm bump:js:major console notebook --force

    # Make sure that a prepublish would include the proper files.
    jlpm run prepublish:check
fi


if [[ $GROUP == usage ]]; then
    # Build the examples.
    jlpm run build:packages
    jlpm run build:examples

    # Test the examples
    jlpm run test:examples

    # Test the cli apps.
    jupyter lab clean --debug
    jupyter lab build --debug
    jupyter lab path --debug
    pushd jupyterlab/tests/mock_packages
    jupyter labextension link extension --no-build --debug
    jupyter labextension unlink extension --no-build --debug
    jupyter labextension link extension --no-build --debug
    jupyter labextension unlink  @jupyterlab/mock-extension --no-build --debug
    jupyter labextension install extension  --no-build --debug
    jupyter labextension list --debug
    jupyter labextension disable @jupyterlab/mock-extension --debug
    jupyter labextension enable @jupyterlab/mock-extension --debug
    jupyter labextension disable @jupyterlab/notebook-extension --debug
    jupyter labextension uninstall @jupyterlab/mock-extension --no-build --debug
    jupyter labextension uninstall @jupyterlab/notebook-extension --no-build --debug
    popd
    jupyter lab workspaces export > workspace.json --debug
    jupyter lab workspaces import --name newspace workspace.json --debug
    jupyter lab workspaces export newspace > newspace.json --debug
    rm workspace.json newspace.json

    # Make sure we can call help on all the cli apps.
    jupyter lab -h
    jupyter lab build -h
    jupyter lab clean -h
    jupyter lab path -h
    jupyter labextension link -h
    jupyter labextension unlink -h
    jupyter labextension install -h
    jupyter labextension uninstall -h
    jupyter labextension list -h
    jupyter labextension enable -h
    jupyter labextension disable -h

    # Make sure we can add and remove a sibling package.
    # jlpm run add:sibling jupyterlab/tests/mock_packages/extension
    # jlpm run build
    # jlpm run remove:package extension
    # jlpm run build
    # jlpm run integrity --force  # Should have a clean tree now

    # Test cli tools
    jlpm run get:dependency mocha
    jlpm run update:dependency mocha
    jlpm run remove:dependency mocha
    jlpm run get:dependency @jupyterlab/buildutils
    jlpm run get:dependency typescript
    jlpm run get:dependency react-native

    # Test theme creation - make sure we can add it as a package, build,
    # and run browser
    pip install -q pexpect
    python scripts/create_theme.py
    mv foo packages
    jlpm run integrity
    jlpm run build:packages
    jlpm run build:dev
    python -m jupyterlab.browser_check --dev-mode
    jlpm run remove:package foo
    jlpm run integrity

    ## Test app directory support being a symlink
    mkdir tmp
    pushd tmp
    mkdir real_app_dir
    ln -s real_app_dir link_app_dir
    # verify that app directory is not resolved
    env JUPYTERLAB_DIR=./link_app_dir jupyter lab path | grep link_app_dir
    popd

    # Build the examples.
    jlpm run build:examples

    # Test the examples
    jlpm run test:examples

    # Make sure we can successfully load the dev app.
    python -m jupyterlab.browser_check --dev-mode

    # Make sure core mode works
    jlpm run build:core
    # Make sure we have a final released version of JupyterLab server
    python -m jupyterlab.browser_check --core-mode

    # Make sure we can run the built app.
    jupyter labextension install ./jupyterlab/tests/mock_packages/extension --debug
    python -m jupyterlab.browser_check
    jupyter labextension list --debug

    # Make sure the deprecated `selenium_check` command still works
    python -m jupyterlab.selenium_check

    # Make sure we can non-dev install.
    virtualenv -p $(which python3) test_install
    ./test_install/bin/pip install -q ".[test]"  # this populates <sys_prefix>/share/jupyter/lab
    ./test_install/bin/python -m jupyterlab.browser_check
    # Make sure we can run the build
    ./test_install/bin/jupyter lab build

    # Make sure we can start and kill the lab server
    ./test_install/bin/jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID

    # Make sure we can clean various bits of the app dir
    jupyter lab clean
    jupyter lab clean --extensions
    jupyter lab clean --settings
    jupyter lab clean --static
    jupyter lab clean --all
fi

if [[ $GROUP == nonode ]]; then
    # Make sure we can install the wheel
    virtualenv -p $(which python3) test_install
    ./test_install/bin/pip install -v --pre --no-cache-dir --no-deps jupyterlab --no-index --find-links=dist  # Install latest jupyterlab
    ./test_install/bin/pip install jupyterlab  # Install jupyterlab dependencies
    ./test_install/bin/python -m jupyterlab.browser_check --no-chrome-test

    # Make sure we can start and kill the lab server
    ./test_install/bin/jupyter lab --no-browser &
    TASK_PID=$!
    # Make sure the task is running
    ps -p $TASK_PID || exit 1
    sleep 5
    kill $TASK_PID
    wait $TASK_PID
fi
