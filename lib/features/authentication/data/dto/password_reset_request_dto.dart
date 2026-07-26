/// DTO for Password Reset HTTP POST payload
class PasswordResetRequestDto {
  final String email;

  const PasswordResetRequestDto({required this.email});

  Map<String, dynamic> toJson() => {'email': email};
}
