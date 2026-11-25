const { IOSConfig, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SWIFT_SOURCE_FILENAME = "ScheduleAppIntents.swift";

function getSwiftSourcePath(projectRoot = process.cwd()) {
  return path.join(projectRoot, "plugins", "ios", SWIFT_SOURCE_FILENAME);
}

function resolveProjectName(projectRoot, config) {
  try {
    return IOSConfig.XcodeUtils.getProjectName(projectRoot);
  } catch {
    return IOSConfig.XcodeUtils.getHackyProjectName(projectRoot, config);
  }
}

const withAppIntents = (config) => {
  return withXcodeProject(config, (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    const sourcePath = getSwiftSourcePath(projectRoot);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        `Fichier natif App Intents introuvable : ${sourcePath}`
      );
    }

    const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
    const projectName = resolveProjectName(projectRoot, modConfig);

    const destDir = path.join(platformProjectRoot, projectName);
    fs.mkdirSync(destDir, { recursive: true });

    const destPath = path.join(destDir, SWIFT_SOURCE_FILENAME);
    fs.copyFileSync(sourcePath, destPath);

    // Chemin POSIX requis pour la résolution PBXGroup dans xcodeproj
    const xcodeRelativePath = `${projectName}/${SWIFT_SOURCE_FILENAME}`;
    const project = modConfig.modResults;

    if (!project.hasFile(xcodeRelativePath)) {
      modConfig.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: xcodeRelativePath,
        groupName: projectName,
        project,
      });
    }

    return modConfig;
  });
};

module.exports = withAppIntents;
module.exports.SWIFT_SOURCE_FILENAME = SWIFT_SOURCE_FILENAME;
module.exports.getSwiftSourcePath = getSwiftSourcePath;
