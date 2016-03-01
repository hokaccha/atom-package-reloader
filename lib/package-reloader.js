'use babel';

import path from 'path';
import { CompositeDisposable } from 'atom';

function getPackageNames() {
  return atom.project.getPaths()
    .map(path => require(`${path}/package.json`).name)
    .filter(name => atom.packages.loadedPackages[name]);
}

function unloadPackage(packageName) {
  return new Promise((resolve) => {
    const disposable = atom.packages.onDidUnloadPackage((pack) => {
      if (packageName === pack.name) {
        Object.keys(require.cache)
        .filter((p) => {
          return p.indexOf(pack.path + path.sep) === 0;
        })
        .forEach((p) => {
          delete require.cache[p];
        });
        delete atom.packages.loadedPackages[packageName];

        resolve(packageName);
        disposable.dispose();
      }
    });
    atom.packages.unloadPackage(packageName);
  });
}

function activatePackage(packageName) {
  return new Promise((resolve) => {
    atom.packages.activatePackage(packageName);
    resolve(packageName);
  });
}

function deactivatePackage(packageName) {
  return new Promise((resolve) => {
    const disposable = atom.packages.onDidDeactivatePackage((pack) => {
      if (packageName === pack.name) {
        resolve(packageName);
        disposable.dispose();
      }
    });
    atom.packages.deactivatePackage(packageName);
  });
}

function disablePackage(packageName) {
  return new Promise((resolve) => {
    atom.packages.disablePackage(packageName);
    resolve(packageName);
  });
}


export default {
  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'package-reloader:reload': () => this.reload()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  reload() {
    let packageName = getPackageNames()[0];
    deactivatePackage(packageName)
      .then(disablePackage)
      .then(unloadPackage)
      .then(activatePackage)
      .then(() => atom.packages.enablePackage(packageName))
      .then(() => atom.notifications.addInfo(`${packageName} reloaded!`))
      .catch(err => console.error(err));
  }
};
