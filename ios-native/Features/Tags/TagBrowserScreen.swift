import SwiftUI

struct TagBrowserScreen: View {
    let service: StudyBrowsingService
    
    @State private var allTags: [StudyTag] = []
    @State private var selectedTag: StudyTag?
    @State private var showNewTagSheet = false
    @State private var searchQuery: String = ""
    
    private var filteredTags: [StudyTag] {
        if searchQuery.isEmpty {
            return allTags
        }
        return allTags.filter { $0.name.lowercased().contains(searchQuery.lowercased()) }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    
                    TextField("Search tags...", text: $searchQuery)
                        .textFieldStyle(.roundedBorder)
                    
                    if !searchQuery.isEmpty {
                        Button(action: { searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(AppSpacing.md)
                
                // Tags list
                if filteredTags.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "tag.slash")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        
                        Text("No Tags")
                            .font(.headline)
                        
                        Text(searchQuery.isEmpty ? "Create your first tag" : "No tags match your search")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                } else {
                    List(filteredTags) { tag in
                        NavigationLink(destination: TagDetailScreen(tag: tag, service: service)) {
                            HStack(spacing: AppSpacing.md) {
                                Circle()
                                    .fill(Color(tag.color))
                                    .frame(width: 12, height: 12)
                                
                                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                    Text(tag.name)
                                        .font(.body.weight(.semibold))
                                    
                                    Text(tagCardCount(tag))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, AppSpacing.sm)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Tags")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { showNewTagSheet = true }) {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showNewTagSheet) {
                NewTagSheet(isPresented: $showNewTagSheet) { newTag in
                    allTags.append(newTag)
                }
            }
            .onAppear {
                loadTags()
            }
        }
    }
    
    private func loadTags() {
        // TODO: Load tags from service
        // For now, this is a placeholder
        allTags = []
    }
    
    private func tagCardCount(_ tag: StudyTag) -> String {
        // TODO: Count cards with this tag
        "0 cards"
    }
}

struct TagDetailScreen: View {
    let tag: StudyTag
    let service: StudyBrowsingService
    
    @State private var cardsWithTag: [StudyCard] = []
    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            // Tag header
            VStack(spacing: AppSpacing.md) {
                Circle()
                    .fill(Color(tag.color))
                    .frame(width: 60, height: 60)
                
                Text(tag.name)
                    .font(.title2.weight(.semibold))
                
                Text("\(cardsWithTag.count) cards")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.lg)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding(AppSpacing.md)
            
            // Cards with this tag
            if cardsWithTag.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    
                    Text("No Cards")
                        .font(.headline)
                    
                    Text("No cards are tagged with \"\(tag.name)\"")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(cardsWithTag) { card in
                    NavigationLink(destination: CardDetailScreenEnhanced(card: card, service: service)) {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text(card.displayTitle)
                                .font(.body.weight(.semibold))
                                .lineLimit(2)
                            
                            Text("Q\(card.questionNumber)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, AppSpacing.sm)
                    }
                }
                .listStyle(.plain)
            }
            
            Spacer()
        }
        .navigationTitle("Tag Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button(action: { showEditSheet = true }) {
                    Image(systemName: "pencil")
                }
                
                Menu {
                    Button(role: .destructive, action: { showDeleteConfirmation = true }) {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            EditTagSheet(tag: tag, isPresented: $showEditSheet)
        }
        .alert("Delete Tag", isPresented: $showDeleteConfirmation) {
            Button("Delete", role: .destructive) {
                // TODO: Delete tag
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this tag? Cards will not be affected.")
        }
        .onAppear {
            loadCardsWithTag()
        }
    }
    
    private func loadCardsWithTag() {
        // TODO: Load cards with this tag
        cardsWithTag = []
    }
}

struct NewTagSheet: View {
    @Binding var isPresented: Bool
    let onSave: (StudyTag) -> Void
    
    @State private var tagName: String = ""
    @State private var selectedColor: String = "#0a7ea4"
    
    private let colors = [
        "#FF6B6B", "#FFA500", "#FFD700",
        "#4ECDC4", "#45B7D1", "#6C5CE7",
        "#A29BFE", "#FF85A2", "#74B9FF"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Tag Name") {
                    TextField("Enter tag name", text: $tagName)
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
                        Button(action: saveTag) {
                            Text("Create Tag")
                        }
                        .disabled(tagName.trimmingCharacters(in: .whitespaces).isEmpty)
                        Spacer()
                    }
                }
            }
            .navigationTitle("New Tag")
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
    
    private func saveTag() {
        let newTag = StudyTag(
            id: UUID().uuidString,
            name: tagName,
            color: selectedColor
        )
        onSave(newTag)
        isPresented = false
    }
}

struct EditTagSheet: View {
    let tag: StudyTag
    @Binding var isPresented: Bool
    
    @State private var tagName: String = ""
    @State private var selectedColor: String = ""
    
    private let colors = [
        "#FF6B6B", "#FFA500", "#FFD700",
        "#4ECDC4", "#45B7D1", "#6C5CE7",
        "#A29BFE", "#FF85A2", "#74B9FF"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Tag Name") {
                    TextField("Enter tag name", text: $tagName)
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
                        Button(action: saveTag) {
                            Text("Save Changes")
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("Edit Tag")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
            .onAppear {
                tagName = tag.name
                selectedColor = tag.color
            }
        }
    }
    
    private func saveTag() {
        // TODO: Save tag changes
        isPresented = false
    }
}

#Preview {
    TagBrowserScreen(service: MockStudyBrowsingService())
}
