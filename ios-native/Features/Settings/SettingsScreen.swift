import SwiftUI

struct SettingsScreen: View {
    @StateObject private var authManager = MockAuthenticationService()
    @State private var selectedTheme: ColorScheme? = nil
    @State private var autoSyncEnabled = true
    @State private var showDataManagement = false
    @State private var showAbout = false
    
    var body: some View {
        NavigationStack {
            Form {
                // Account Section
                Section("Account") {
                    if let user = authManager.currentUser {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            Text(user.displayName ?? user.email)
                                .font(.body.weight(.semibold))
                            Text(user.email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        
                        Button(role: .destructive, action: signOut) {
                            Text("Sign Out")
                        }
                    } else {
                        Button(action: signIn) {
                            Text("Sign In with Google")
                        }
                    }
                }
                
                // Appearance Section
                Section("Appearance") {
                    Picker("Theme", selection: $selectedTheme) {
                        Text("System").tag(nil as ColorScheme?)
                        Text("Light").tag(ColorScheme.light)
                        Text("Dark").tag(ColorScheme.dark)
                    }
                }
                
                // Data & Sync Section
                Section("Data & Sync") {
                    Toggle("Auto Sync", isOn: $autoSyncEnabled)
                    
                    NavigationLink(destination: DataManagementScreen()) {
                        Label("Data Management", systemImage: "externaldrive")
                    }
                }
                
                // Display Section
                Section("Display") {
                    NavigationLink(destination: DisplaySettingsScreen()) {
                        Label("Display Preferences", systemImage: "textformat")
                    }
                }
                
                // About Section
                Section {
                    NavigationLink(destination: AboutScreen()) {
                        Label("About", systemImage: "info.circle")
                    }
                    
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func signIn() {
        Task {
            do {
                _ = try await authManager.signInWithGoogle()
            } catch {
                print("Sign in failed: \(error)")
            }
        }
    }
    
    private func signOut() {
        do {
            try authManager.signOut()
        } catch {
            print("Sign out failed: \(error)")
        }
    }
}

struct DataManagementScreen: View {
    @State private var showExportConfirmation = false
    @State private var showImportPicker = false
    @State private var showDeleteConfirmation = false
    
    var body: some View {
        Form {
            Section("Export") {
                Button(action: { showExportConfirmation = true }) {
                    Label("Export All Data", systemImage: "arrow.up.doc")
                }
                
                Text("Export your cards and settings as a JSON file")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Section("Import") {
                Button(action: { showImportPicker = true }) {
                    Label("Import Data", systemImage: "arrow.down.doc")
                }
                
                Text("Import cards from a previously exported file")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Section("Danger Zone") {
                Button(role: .destructive, action: { showDeleteConfirmation = true }) {
                    Label("Delete All Data", systemImage: "trash")
                }
                
                Text("Permanently delete all cards and settings. This cannot be undone.")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .navigationTitle("Data Management")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Export Data", isPresented: $showExportConfirmation) {
            Button("Export", action: exportData)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Export all your cards and settings as a JSON file?")
        }
        .alert("Delete All Data", isPresented: $showDeleteConfirmation) {
            Button("Delete", role: .destructive, action: deleteAllData)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure? This will permanently delete all your data and cannot be undone.")
        }
    }
    
    private func exportData() {
        // TODO: Implement data export
        print("Exporting data...")
    }
    
    private func deleteAllData() {
        // TODO: Implement data deletion
        print("Deleting all data...")
    }
}

struct DisplaySettingsScreen: View {
    @State private var defaultDisplayMode: CardDisplayMode = .card
    @State private var fontSize: CGFloat = 16
    @State private var lineSpacing: CGFloat = 1.2
    
    var body: some View {
        Form {
            Section("Default Display Mode") {
                Picker("Display Mode", selection: $defaultDisplayMode) {
                    Text("Card View").tag(CardDisplayMode.card)
                    Text("Fluid View").tag(CardDisplayMode.fluid)
                }
            }
            
            Section("Font Size") {
                HStack {
                    Text("Small")
                    Slider(value: $fontSize, in: 12...24, step: 1)
                    Text("Large")
                }
                
                Text(String(format: "%.0f pt", fontSize))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Section("Line Spacing") {
                HStack {
                    Text("Compact")
                    Slider(value: $lineSpacing, in: 1.0...2.0, step: 0.1)
                    Text("Spacious")
                }
                
                Text(String(format: "%.1f", lineSpacing))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Display Preferences")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutScreen: View {
    var body: some View {
        Form {
            Section {
                VStack(alignment: .center, spacing: AppSpacing.md) {
                    Image(systemName: "books.vertical")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)
                    
                    Text("FlashCard Master")
                        .font(.title2.weight(.semibold))
                    
                    Text("Version 1.0.0")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(AppSpacing.lg)
            }
            
            Section("About") {
                Text("FlashCard Master is a powerful learning tool designed to help you master any subject through spaced repetition and active recall.")
            }
            
            Section("Features") {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    FeatureRow(icon: "folder", title: "Organize", description: "Create folders and card sets")
                    FeatureRow(icon: "square.and.pencil", title: "Create", description: "Add rich content cards")
                    FeatureRow(icon: "magnifyingglass", title: "Search", description: "Find cards quickly")
                    FeatureRow(icon: "tag", title: "Tag", description: "Organize with tags")
                    FeatureRow(icon: "icloud", title: "Sync", description: "Cloud synchronization")
                }
            }
            
            Section("Links") {
                Link("Privacy Policy", destination: URL(string: "https://example.com/privacy")!)
                Link("Terms of Service", destination: URL(string: "https://example.com/terms")!)
                Link("Contact Support", destination: URL(string: "mailto:support@example.com")!)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(title)
                    .font(.body.weight(.semibold))
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    SettingsScreen()
}
