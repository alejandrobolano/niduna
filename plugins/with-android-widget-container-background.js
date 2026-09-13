const fs = require('node:fs/promises');
const path = require('node:path');

const { withDangerousMod } = require('expo/config-plugins');

const lightBackground = '#FFF8E8';
const darkBackground = '#151A33';

function createBackgroundDrawable(color) {
  return `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${color}" />
    <corners android:radius="24dp" />
</shape>
`;
}

function createWidgetLayout({ dark }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@android:id/background"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/niduna_widget_background">

    <ImageView
        android:id="@+id/rn_widget_image_light"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="@android:color/transparent"
        android:scaleType="matrix"
        android:visibility="${dark ? 'gone' : 'visible'}" />

    <ImageView
        android:id="@+id/rn_widget_image_dark"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="@android:color/transparent"
        android:scaleType="matrix"
        android:visibility="${dark ? 'visible' : 'gone'}" />

    <FrameLayout
        android:id="@+id/rn_widget_clickable_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <FrameLayout
        android:id="@+id/rn_widget_collection_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
</FrameLayout>
`;
}

async function writeResource(projectRoot, directory, fileName, content) {
  const resourceDirectory = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'res',
    directory,
  );

  await fs.mkdir(resourceDirectory, { recursive: true });
  await fs.writeFile(path.join(resourceDirectory, fileName), content, 'utf8');
}

module.exports = function withAndroidWidgetContainerBackground(config) {
  return withDangerousMod(config, [
    'android',
    async (projectConfig) => {
      const { projectRoot } = projectConfig.modRequest;

      await Promise.all([
        writeResource(
          projectRoot,
          'drawable',
          'niduna_widget_background.xml',
          createBackgroundDrawable(lightBackground),
        ),
        writeResource(
          projectRoot,
          'drawable-night',
          'niduna_widget_background.xml',
          createBackgroundDrawable(darkBackground),
        ),
        writeResource(projectRoot, 'layout', 'rn_widget.xml', createWidgetLayout({ dark: false })),
        writeResource(projectRoot, 'layout-night', 'rn_widget.xml', createWidgetLayout({ dark: true })),
      ]);

      return projectConfig;
    },
  ]);
};
