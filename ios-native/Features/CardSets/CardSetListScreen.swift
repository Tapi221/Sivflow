import SwiftUI

// Kept for compatibility with older navigation flows.
// Newer navigation routes directly through FolderListScreen.
struct CardSetListScreen: View {
    let folder: StudyFolder
    let service: StudyBrowsingService

    var body: some View {
        FolderListScreen(title: folder.folderName, folder: folder, service: service)
    }
}
