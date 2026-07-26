/// DTO for Password Reset Confirmation HTTP POST payload
class ResetPasswordConfirmRequestDto {
  final String uid;
  final String token;
  final String newPassword;
  final String reNewPassword;

  const ResetPasswordConfirmRequestDto({
    required this.uid,
    required this.token,
    required this.newPassword,
    required this.reNewPassword,
  });

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'token': token,
        'new_password': newPassword,
        're_new_password': reNewPassword,
      };
}
