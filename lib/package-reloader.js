'use babel';

import path from 'path';
import fs from 'fs';
import { CompositeDisposable } from 'atom';

function getPackageNames() {
  return atom.project.getPaths()
    .map(path => require(`${path}/package.json`).name)
    .filter(name => atom.packages.loadedPackages[name]);
}

function unloadPackage(packageName) {
  return new Promise((resolve) => {
    let disposable = atom.packages.onDidUnloadPackage((pack) => {
      Object.keys(require.cache).filter((p) => {
        return p.indexOf(fs.realpathSync(pack.path) + path.sep) === 0;
      })
      .forEach((p) => {
        delete require.cache[p];
      });
      delete atom.packages.loadedPackages[packageName];

      resolve(packageName);
      disposable.dispose();
    });
    atom.packages.unloadPackage(packageName);
  });
}

function activatePackage(packageName) {
  return new Promise((resolve) => {
    let disposable = atom.packages.onDidActivatePackage(() => {
      resolve(packageName);
      disposable.dispose();
    });
    atom.packages.activatePackage(packageName);
  });
}

function deactivatePackage(packageName) {
  return new Promise((resolve) => {
    let disposable = atom.packages.onDidDeactivatePackage(() => {
      resolve(packageName);
      disposable.dispose();
    });
    atom.packages.deactivatePackage(packageName);
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
      .then(unloadPackage)
      .then(activatePackage)
      .then(() => atom.notifications.addInfo(`${packageName} reloaded!`))
      .catch(err => console.error(err));
  }
};
