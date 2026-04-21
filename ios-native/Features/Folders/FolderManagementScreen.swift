import SwiftUI

struct FolderManagementScreen: View {
    let parentFolderId: String?
    let service: StudyBrowsingService
    
    @State private var showNewFolderSheet = false
    @State private var showNewCardSetSheet = false
    @State private var editingFolder: StudyFolder?
    @State private var editingCardSet: StudyCardSet?
    @State private var deleteConfirmation: DeleteConfirmation?
    
    private var folders: [StudyFolder] {
        service.listFolders(parentFolderId: parentFolderId)
    }
    
    private var cardSets: [StudyCardSet] {
        service.listCardSets(folderId: parentFolderId)
    }
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            // Action buttons
            HStack(spacing: AppSpacing.md) {
                Button(action: { showNewFolderSheet = true }) {
                    Label("New Folder", systemImage: "folder.badge.plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                
                Button(action: { showNewCardSetSheet = true }) {
                    Label("New Set", systemImage: "square.stack.3d.up.badge.plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .padding(AppSpacing.md)
            
            // Content
            if folders.isEmpty && cardSets.isEmpty {
                emptyState
            } else {
                List {
                    if !folders.isEmpty {
                        Section("Folders") {
                            ForEach(folders) { folder in
                                FolderRow(
                                    folder: folder,
                                    onEdit: { editingFolder = folder },
                                    onDelete: {
                                        deleteConfirmation = DeleteConfirmation(
                                            type: .folder,
                                            id: folder.id,
                                            name: folder.name
                                        )
                                    }
                                )
                            }
                        }
                    }
                    
                    if !cardSets.isEmpty {
                        Section("Card Sets") {
                            ForEach(cardSets) { cardSet in
                                CardSetRow(
                                    cardSet: cardSet,
                                    cardCount: service.listCards(cardSetId: cardSet.id).count,
                                    onEdit: { editingCardSet = cardSet },
                                    onDelete: {
                                        deleteConfirmation = DeleteConfirmation(
                                            type: .cardSet,
                                            id: cardSet.id,
                                            name: cardSet.name
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .sheet(isPresented: $showNewFolderSheet) {
            NewFolderSheet(
                parentFolderId: parentFolderId,
                isPresented: $showNewFolderSheet
            )
        }
        .sheet(isPresented: $showNewCardSetSheet) {
            NewCardSetSheet(
                folderId: parentFolderId,
                isPresented: $showNewCardSetSheet
            )
        }
        .sheet(item: $editingFolder) { folder in
            EditFolderSheet(folder: folder, isPresented: Binding(
                get: { editingFolder != nil },
                set: { if !$0 { editingFolder = nil } }
            ))
        }
        .sheet(item: $editingCardSet) { cardSet in
            EditCardSetSheet(cardSet: cardSet, isPresented: Binding(
                get: { editingCardSet != nil },
                set: { if !$0 { editingCardSet = nil } }
            ))
        }
        .alert("Delete", isPresented: Binding(
            get: { deleteConfirmation != nil },
            set: { if !$0 { deleteConfirmation = nil } }
        )) {
            Button("Delete", role: .destructive) {
                if let confirmation = deleteConfirmation {
                    handleDelete(confirmation)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let confirmation = deleteConfirmation {
                Text("Are you sure you want to delete \"\(confirmation.name)\"?")
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "folder.badge.questionmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            
            Text("No Items")
                .font(.headline)
            
            Text("Create a folder or card set to get started")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
    
    private func handleDelete(_ confirmation: DeleteConfirmation) {
        // TODO: Implement actual delete logic
        print("Deleting \(confirmation.type) with id: \(confirmation.id)")
    }
}

struct FolderRow: View {
    let folder: StudyFolder
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Circle()
                .fill(Color(folder.color))
                .frame(width: 12, height: 12)
            
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(folder.name)
                    .font(.body.weight(.semibold))
                
                Text("Folder")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Menu {
                Button(action: onEdit) {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, AppSpacing.sm)
    }
}

struct CardSetRow: View {
    let cardSet: StudyCardSet
    let cardCount: Int
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Image(systemName: "square.stack.3d.up")
                .foregroundStyle(.blue)
            
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(cardSet.name)
                    .font(.body.weight(.semibold))
                
                Text("\(cardCount) cards")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Menu {
                Button(action: onEdit) {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, AppSpacing.sm)
    }
}

struct NewFolderSheet: View {
    let parentFolderId: String?
    @Binding var isPresented: Bool
    
    @State private var folderName: String = ""
    @State private var selectedColor: String = "#0a7ea4"
    
    private let colors = [
        "#FF6B6B", "#FFA500", "#FFD700",
        "#4ECDC4", "#45B7D1", "#6C5CE7",
        "#A29BFE", "#FF85A2", "#74B9FF"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Folder Name") {
                    TextField("Enter folder name", text: $folderName)
                }
                
                Section("Color") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: AppSpacing.md) {
                            ForEach(colors, id: \.self) { color in
                                Button(action: { selectedColor = color }) {
                                    Circle()
                                        .fill(Color(color))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            selectedColor == color
                                                ? Circle().stroke(Color.primary, lineWidth: 2)
                                                : nil
                                        )
                                }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
                
                Section {
                    HStack {
                        Spacer()
                        Button(action: createFolder) {
                            Text("Create Folder")
                        }
                        .disabled(folderName.trimmingCharacters(in: .whitespaces).isEmpty)
                        Spacer()
                    }
                }
            }
            .navigationTitle("New Folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
        }
    }
    
    private func createFolder() {
        // TODO: Create folder
        isPresented = false
    }
}

struct EditFolderSheet: View {
    let folder: StudyFolder
    @Binding var isPresented: Bool
    
    @State private var folderName: String = ""
    @State private var selectedColor: String = ""
    
    private let colors = [
        "#FF6B6B", "#FFA500", "#FFD700",
        "#4ECDC4", "#45B7D1", "#6C5CE7",
        "#A29BFE", "#FF85A2", "#74B9FF"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Folder Name") {
                    TextField("Enter folder name", text: $folderName)
                }
                
                Section("Color") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: AppSpacing.md) {
                            ForEach(colors, id: \.self) { color in
                                Button(action: { selectedColor = color }) {
                                    Circle()
                                        .fill(Color(color))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            selectedColor == color
                                                ? Circle().stroke(Color.primary, lineWidth: 2)
                                                : nil
                                        )
                                }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
                
                Section {
                    HStack {
                        Spacer()
                        Button(action: saveFolder) {
                            Text("Save Changes")
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("Edit Folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
            .onAppear {
                folderName = folder.name
                selectedColor = folder.color
            }
        }
    }
    
    private func saveFolder() {
        // TODO: Save folder changes
        isPresented = false
    }
}

struct NewCardSetSheet: View {
    let folderId: String?
    @Binding var isPresented: Bool
    
    @State private var cardSetName: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Card Set Name") {
                    TextField("Enter card set name", text: $cardSetName)
                }
                
                Section {
                    HStack {
                        Spacer()
                        Button(action: createCardSet) {
                            Text("Create Card Set")
                        }
                        .disabled(cardSetName.trimmingCharacters(in: .whitespaces).isEmpty)
                        Spacer()
                    }
                }
            }
            .navigationTitle("New Card Set")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
        }
    }
    
    private func createCardSet() {
        // TODO: Create card set
        isPresented = false
    }
}

struct EditCardSetSheet: View {
    let cardSet: StudyCardSet
    @Binding var isPresented: Bool
    
    @State private var cardSetName: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Card Set Name") {
                    TextField("Enter card set name", text: $cardSetName)
                }
                
                Section {
                    HStack {
                        Spacer()
                        Button(action: saveCardSet) {
                            Text("Save Changes")
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("Edit Card Set")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
            .onAppear {
                cardSetName = cardSet.name
            }
        }
    }
    
    private func saveCardSet() {
        // TODO: Save card set changes
        isPresented = false
    }
}

struct DeleteConfirmation {
    enum DeleteType {
        case folder
        case cardSet
    }
    
    let type: DeleteType
    let id: String
    let name: String
}

#Preview {
    FolderManagementScreen(parentFolderId: nil, service: MockStudyBrowsingService())
}
